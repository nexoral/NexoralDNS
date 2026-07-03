const GITHUB_REPO = 'nexoral/NexoralDNS';

// Next.js's Data Cache: a shared, server-side cache keyed by fetch URL/options.
// The first request after this window expires triggers the real GitHub call;
// every other request — from any user — is served the cached result until then.
const REVALIDATE_SECONDS = 12 * 60 * 60; // 12 hours

// Used only if GitHub is unreachable (rate limit, outage, network error), so the
// site never breaks or shows blank content — falls back to the last-known-good values.
const FALLBACK_VERSION = '5.8.47-stable';
const FALLBACK_INSTALL_SCRIPT_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/Scripts/install.sh`;

interface GitHubContentsResponse {
  content: string;
  encoding: string;
}

// atob + TextDecoder instead of Buffer: Buffer is a Node.js API and isn't guaranteed
// on non-Node runtimes (e.g. Cloudflare Workers). atob/Uint8Array/TextDecoder are
// standard Web Platform APIs available on both Node 18+ and Workers, so this decode
// works unchanged regardless of hosting target. atob() is strict about the base64
// alphabet and throws on the embedded newline GitHub's API actually returns in
// `content`, so whitespace must be stripped first — Buffer.from() tolerated that
// silently, which is why this needs explicit handling here.
function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

async function fetchRepoFile(path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

  try {
    // Fires every time this function runs, cache hit or miss — Next's Data Cache
    // intercepts inside the fetch() call below, not around this function, so there's
    // no reliable way to tell HIT from MISS from here. For the authoritative signal,
    // check the terminal for Next's own fetch logging (logging.fetches in next.config.ts).
    console.log(`[github] requesting ${path} from GitHub`);

    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.warn(`[github] GitHub returned ${res.status} for ${path} — falling back to last-known-good value`);
      return null;
    }

    const data: GitHubContentsResponse = await res.json();
    if (data.encoding !== 'base64') return null;

    return decodeBase64Utf8(data.content);
  } catch (error) {
    console.warn(`[github] fetch failed for ${path} — falling back to last-known-good value:`, error);
    return null;
  }
}

/**
 * Latest released version, read live from the repo's VERSION file on GitHub
 * instead of being hand-copied into the docs site. Server-side cached for 12h.
 */
export async function getLatestVersion(): Promise<string> {
  const content = await fetchRepoFile('VERSION');
  return content?.trim() || FALLBACK_VERSION;
}

/**
 * The install script's raw.githubusercontent.com URL, extracted live from
 * README.md so every curl command on the docs site tracks the real repo
 * instead of being hand-copied across a dozen pages. Same 12h server-side cache.
 */
export async function getInstallScriptUrl(): Promise<string> {
  const content = await fetchRepoFile('README.md');
  const match = content?.match(
    new RegExp(`https://raw\\.githubusercontent\\.com/${GITHUB_REPO}/[\\w-]+/Scripts/install\\.sh`)
  );
  return match?.[0] || FALLBACK_INSTALL_SCRIPT_URL;
}

/** Builds the command for a given script URL, using the new CLI wrapper if a subcommand is provided. */
export function installCommand(scriptUrl: string, subcommand?: string): string {
  return subcommand
    ? `nexoraldns ${subcommand}`
    : `curl -fsSL ${scriptUrl} | sudo bash -`;
}
