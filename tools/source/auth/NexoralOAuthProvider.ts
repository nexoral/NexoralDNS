import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import type { Response as ExpressResponse } from "express";
import type { OAuthServerProvider, AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull, OAuthTokenRevocationRequest, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidGrantError, InvalidTokenError, ServerError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { ACCESS_TOKEN_TTL_SECONDS, LOGIN_PATH, ToolsKeys } from "../core/key";
import logger from "../utilities/logger";

const INSTALL_DIR = join(homedir(), ".nexoraldns");
const CLIENTS_FILE = join(INSTALL_DIR, "oauth-clients.json");

const AUTH_REQUEST_TTL_MS = 10 * 60_000;
const AUTH_CODE_TTL_MS = 60_000;
const VERIFY_CACHE_TTL_MS = 30_000;

/**
 * `AuthInfo.clientId` is informational here — every authorization decision is
 * made by `server/` from the token itself, never from the OAuth client.
 */
const MCP_CLIENT_ID = "nexoraldns-mcp";

interface PendingAuthorization {
  clientId: string;
  clientName: string;
  codeChallenge: string;
  redirectUri: string;
  state?: string;
  expiresAt: number;
}

interface IssuedCode {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Reads the two auth cookies out of a `server/` response. Login and refresh
 * deliver tokens only this way — never in the JSON body — so this is the sole
 * extraction point.
 */
function extractTokens(response: Response): { accessToken?: string; refreshToken?: string } {
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  for (const cookie of response.headers.getSetCookie()) {
    const [name, value] = cookie.split(";")[0].split("=");
    if (name.trim() === "access_token") accessToken = value;
    if (name.trim() === "refresh_token") refreshToken = value;
  }

  return { accessToken, refreshToken };
}

/** Drops entries whose `expiresAt` has passed — called on every insert, so the maps stay bounded. */
function sweep<T extends { expiresAt: number }>(entries: Map<string, T>): void {
  const now = Date.now();
  for (const [key, value] of entries) {
    if (value.expiresAt <= now) entries.delete(key);
  }
}

/**
 * Dynamically registered clients, persisted so a tools-server restart doesn't
 * invalidate an already-authorized client.
 */
class FileClientsStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>();

  constructor() {
    if (!existsSync(CLIENTS_FILE)) return;
    try {
      const stored = JSON.parse(readFileSync(CLIENTS_FILE, "utf-8")) as OAuthClientInformationFull[];
      for (const client of stored) this.clients.set(client.client_id, client);
    } catch (error) {
      logger.error("[OAuth] failed to read registered clients, starting empty", error);
    }
  }

  public getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }

  public registerClient(client: OAuthClientInformationFull): OAuthClientInformationFull {
    this.clients.set(client.client_id, client);
    try {
      mkdirSync(INSTALL_DIR, { recursive: true, mode: 0o700 });
      writeFileSync(CLIENTS_FILE, JSON.stringify([...this.clients.values()]), { mode: 0o600 });
    } catch (error) {
      logger.error("[OAuth] failed to persist registered clients", error);
    }
    logger.info(`[OAuth] registered client "${client.client_name ?? client.client_id}"`);
    return client;
  }
}

/**
 * OAuth authorization server for the MCP endpoint, backed entirely by `server/`.
 *
 * This class mints nothing of its own: the human authenticates against the
 * existing `POST /api/auth/login`, and the JWTs `server/` already issues are
 * handed straight to the MCP client as the OAuth access/refresh token pair.
 * `server/` therefore remains the single authority on identity, permissions
 * and session lifetime — this is only the OAuth choreography around it.
 */
export class NexoralOAuthProvider implements OAuthServerProvider {
  public readonly clientsStore = new FileClientsStore();

  private readonly pending = new Map<string, PendingAuthorization>();
  private readonly codes = new Map<string, IssuedCode>();
  /** Successful verifications only, so a revoked session recovers within one TTL. */
  private readonly verified = new Map<string, { info: AuthInfo; checkedAt: number }>();

  /**
   * Step 1 of the browser flow: park the validated request and send the user
   * to this server's own login page. No credentials pass through the MCP
   * client or the LLM at any point.
   */
  public async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: ExpressResponse): Promise<void> {
    const requestId = randomBytes(16).toString("hex");
    sweep(this.pending);
    this.pending.set(requestId, {
      clientId: client.client_id,
      clientName: client.client_name ?? client.client_id,
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      state: params.state,
      expiresAt: Date.now() + AUTH_REQUEST_TTL_MS,
    });
    res.redirect(`${LOGIN_PATH}?request=${requestId}`);
  }

  /** The client name is shown on the login page so the admin sees what they are authorizing. */
  public clientNameFor(requestId: string): string | undefined {
    const request = this.pending.get(requestId);
    return request && request.expiresAt > Date.now() ? request.clientName : undefined;
  }

  /**
   * Step 2: the login page posts the credentials here. They go straight to
   * `server/` and are never stored — only the tokens it returns are kept, for
   * the ~60s until the client redeems the authorization code.
   */
  public async completeLogin(
    requestId: string,
    username: string,
    password: string,
  ): Promise<{ redirectTo: string } | { error: string }> {
    const request = this.pending.get(requestId);
    if (!request || request.expiresAt <= Date.now()) {
      this.pending.delete(requestId);
      return { error: "This login request has expired — start again from your MCP client." };
    }

    const response = await fetch(`${ToolsKeys.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => undefined);

    if (!response) return { error: "NexoralDNS server is unreachable." };
    if (!response.ok) {
      logger.warn(`[OAuth] login failed for "${username}"`);
      return { error: "Invalid username or password." };
    }

    const { accessToken, refreshToken } = extractTokens(response);
    if (!accessToken || !refreshToken) {
      logger.error(`[OAuth] login succeeded for "${username}" but no session tokens were issued`);
      return { error: "Login succeeded but no session tokens were issued." };
    }

    this.pending.delete(requestId);
    const code = randomBytes(32).toString("hex");
    sweep(this.codes);
    this.codes.set(code, {
      clientId: request.clientId,
      codeChallenge: request.codeChallenge,
      redirectUri: request.redirectUri,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    });

    const redirectTo = new URL(request.redirectUri);
    redirectTo.searchParams.set("code", code);
    if (request.state !== undefined) redirectTo.searchParams.set("state", request.state);

    logger.info(`[OAuth] "${username}" authorized client "${request.clientName}"`);
    return { redirectTo: redirectTo.href };
  }

  /** The SDK performs the PKCE comparison itself with what this returns. */
  public async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
    const issued = this.codes.get(authorizationCode);
    if (!issued || issued.expiresAt <= Date.now() || issued.clientId !== client.client_id) {
      throw new InvalidGrantError("Authorization code is invalid or expired");
    }
    return issued.codeChallenge;
  }

  public async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const issued = this.codes.get(authorizationCode);
    // Single use: consumed whether or not the checks below pass.
    this.codes.delete(authorizationCode);

    if (!issued || issued.expiresAt <= Date.now() || issued.clientId !== client.client_id) {
      throw new InvalidGrantError("Authorization code is invalid or expired");
    }
    if (redirectUri !== undefined && redirectUri !== issued.redirectUri) {
      throw new InvalidGrantError("redirect_uri does not match the authorization request");
    }

    return {
      access_token: issued.accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: issued.refreshToken,
    };
  }

  /** Delegated to `server/`'s existing refresh endpoint — same rotation, same session document. */
  public async exchangeRefreshToken(_client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(`${ToolsKeys.API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshToken}` },
    }).catch(() => undefined);

    if (!response) throw new ServerError("NexoralDNS server is unreachable");
    if (!response.ok) throw new InvalidGrantError("Refresh token is invalid or expired");

    const tokens = extractTokens(response);
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new ServerError("Refresh succeeded but no session tokens were issued");
    }

    return {
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: tokens.refreshToken,
    };
  }

  /**
   * Authoritative check against `server/` — a rejected token here is what
   * produces the 401 that makes the MCP client refresh and retry, so it must
   * not be cached long. Failures are never cached.
   *
   * ponytail: 30s positive cache; verify locally against the JWT secret if the
   * loopback round trip ever shows up in latency.
   */
  public async verifyAccessToken(token: string): Promise<AuthInfo> {
    const cached = this.verified.get(token);
    if (cached && Date.now() - cached.checkedAt < VERIFY_CACHE_TTL_MS) return cached.info;

    const response = await fetch(`${ToolsKeys.API_BASE_URL}/auth/verify`, {
      headers: { Cookie: `access_token=${token}` },
    }).catch(() => undefined);

    if (!response) throw new ServerError("NexoralDNS server is unreachable");
    if (!response.ok) {
      this.verified.delete(token);
      throw new InvalidTokenError("Access token is invalid or expired");
    }

    const info: AuthInfo = {
      token,
      clientId: MCP_CLIENT_ID,
      scopes: [],
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    };
    this.verified.set(token, { info, checkedAt: Date.now() });
    return info;
  }

  /** Wired to `server/`'s logout so revoking from the client ends the real session. */
  public async revokeToken(_client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    this.verified.delete(request.token);
    await fetch(`${ToolsKeys.API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Cookie: `access_token=${request.token}` },
    }).catch(() => undefined);
  }
}

export default new NexoralOAuthProvider();
