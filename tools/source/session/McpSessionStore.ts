import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import logger from "../utilities/logger";

export interface McpUserSession {
  username: string;
  accessToken: string;
  refreshToken: string;
}

export interface StoredCredentials {
  username: string;
  password: string;
}

export interface ISessionStore {
  get(mcpSessionId: string): McpUserSession | undefined;
  set(mcpSessionId: string, session: McpUserSession, password: string): void;
  updateTokens(mcpSessionId: string, accessToken: string, refreshToken: string): void;
  getCredentials(mcpSessionId: string): StoredCredentials | undefined;
  clear(mcpSessionId: string): void;
}

/** $HOME/.nexoraldns — dedicated dotfolder for this tool server's own local state. */
const INSTALL_DIR = join(homedir(), ".nexoraldns");
const SESSION_FILE = join(INSTALL_DIR, "mcp-session.json");
/** Deliberately a separate file from SESSION_FILE — a copy of one without the other is useless. */
const KEY_FILE = join(INSTALL_DIR, "mcp-session.key");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended GCM nonce length

interface EncryptedBlob {
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

interface PersistedSession extends McpUserSession {
  credentials: EncryptedBlob;
}

/**
 * Token + credential bookkeeping for the NexoralDNS dashboard login, persisted to disk.
 *
 * This tool server is a single-admin, LAN-only local process — there is one
 * dashboard identity to remember, not one per MCP transport connection — so
 * the `mcpSessionId` parameters below are accepted (to keep the `ISessionStore`
 * interface, and every caller, unchanged) but not used as a lookup key. A
 * single on-disk session is loaded at startup and shared by every transport
 * connection, so a login survives client reconnects (each of which gets a
 * fresh transport session ID from `index.ts`) and tools-server restarts.
 *
 * The username/password are kept too (AES-256-GCM, random IV per write, key
 * in a sibling file) purely so `ApiClient` can silently re-authenticate once
 * the refresh token itself expires (48h) without a human re-entering
 * credentials — this is at-rest obfuscation against casually reading the
 * session file, not protection against an attacker with full access to this
 * machine, since the key necessarily lives locally too for unattended decryption.
 */
class McpSessionStore implements ISessionStore {
  private current: McpUserSession | undefined;
  private currentPassword: string | undefined;

  constructor() {
    const loaded = this.loadFromDisk();
    if (!loaded) return;
    const { credentials, ...session } = loaded;
    this.current = session;
    this.currentPassword = this.decrypt(credentials)?.password;
  }

  public get(_mcpSessionId: string): McpUserSession | undefined {
    return this.current;
  }

  public set(_mcpSessionId: string, session: McpUserSession, password: string): void {
    this.current = session;
    this.currentPassword = password;
    this.persist(session, password);
  }

  public updateTokens(_mcpSessionId: string, accessToken: string, refreshToken: string): void {
    if (!this.current) return;
    this.current = { ...this.current, accessToken, refreshToken };
    if (this.currentPassword) this.persist(this.current, this.currentPassword);
  }

  public getCredentials(_mcpSessionId: string): StoredCredentials | undefined {
    if (!this.current || !this.currentPassword) return undefined;
    return { username: this.current.username, password: this.currentPassword };
  }

  public clear(_mcpSessionId: string): void {
    this.current = undefined;
    this.currentPassword = undefined;
    try {
      rmSync(SESSION_FILE, { force: true });
    } catch (error) {
      logger.error("[Auth] failed to remove persisted session file", error);
    }
  }

  private loadFromDisk(): PersistedSession | undefined {
    if (!existsSync(SESSION_FILE)) return undefined;
    try {
      return JSON.parse(readFileSync(SESSION_FILE, "utf-8")) as PersistedSession;
    } catch (error) {
      logger.error("[Auth] failed to read persisted session file, ignoring it", error);
      return undefined;
    }
  }

  private persist(session: McpUserSession, password: string): void {
    try {
      mkdirSync(INSTALL_DIR, { recursive: true, mode: 0o700 });
      const credentials = this.encrypt({ username: session.username, password });
      const payload: PersistedSession = { ...session, credentials };
      writeFileSync(SESSION_FILE, JSON.stringify(payload), { mode: 0o600 });
    } catch (error) {
      logger.error("[Auth] failed to persist session file", error);
    }
  }

  private loadOrCreateKey(): Buffer {
    if (existsSync(KEY_FILE)) {
      try {
        return Buffer.from(readFileSync(KEY_FILE, "utf-8").trim(), "base64");
      } catch (error) {
        logger.error("[Auth] failed to read encryption key, regenerating one", error);
      }
    }
    const key = randomBytes(32);
    mkdirSync(INSTALL_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(KEY_FILE, key.toString("base64"), { mode: 0o600 });
    return key;
  }

  private encrypt(credentials: StoredCredentials): EncryptedBlob {
    const key = this.loadOrCreateKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf-8"), cipher.final()]);
    return {
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }

  private decrypt(blob: EncryptedBlob | undefined): StoredCredentials | undefined {
    if (!blob || !existsSync(KEY_FILE)) return undefined;
    try {
      const key = this.loadOrCreateKey();
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(blob.iv, "base64"));
      decipher.setAuthTag(Buffer.from(blob.authTag, "base64"));
      const plaintext = Buffer.concat([decipher.update(Buffer.from(blob.ciphertext, "base64")), decipher.final()]);
      return JSON.parse(plaintext.toString("utf-8")) as StoredCredentials;
    } catch (error) {
      logger.error("[Auth] failed to decrypt persisted credentials, discarding them", error);
      return undefined;
    }
  }
}

export default new McpSessionStore();
