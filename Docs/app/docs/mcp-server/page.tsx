import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const LOGIN_PROMPT = 'Login to the nexoraldns MCP server with username admin and password admin';
const CHANGE_PASSWORD_PROMPT = 'Use the change_password tool: current password admin, new password <your new password>';

const blocks: Block[] = [
  { type: 'p', text: 'The MCP tool server (`tools/`) is a fifth, independent NexoralDNS process that speaks the Model Context Protocol (MCP) — the open standard that lets an LLM call external tools. It is a thin protocol translator: every tool call becomes a real HTTP request against the same authenticated REST API the dashboard uses, so no new authorization model exists anywhere. Whatever role and permissions your dashboard account has are exactly what your AI agent can do — nothing more.' },

  { type: 'callout', tone: 'danger', title: 'LAN-only, like everything else in NexoralDNS', text: 'The MCP server binds across your local network (0.0.0.0:4774), not the public internet. It has no TLS and no per-request API-key auth beyond a Host-header allowlist — never port-forward it, tunnel it, or expose it outside your LAN. Every configuration below points an AI agent at a local or LAN address only.' },

  { type: 'h', title: 'Already running — no setup needed', eyebrow: 'Setup' },
  { type: 'p', text: 'The MCP tool server ships as part of the standard Docker install, alongside the DNS engine, dashboard, and DHCP server — the install script already starts it for you as a 5th managed process (ecosystem.config.js / PM2). There\'s nothing to install or run separately.' },
  { type: 'kv', items: [
    { k: 'Endpoint', v: 'http://<your-machine-IP>:4774/mcp' },
    { k: 'Health check', v: 'curl http://localhost:4773/api/health (the REST API it talks to)' },
  ]},
  { type: 'callout', tone: 'tip', title: 'Only for contributors running from source', text: 'If you\'re developing against a non-Docker checkout: cd tools && npm install && npm run build && npm start (server/ must also be running — tools/ is only a client of its REST API, it has no database connection of its own).' },

  { type: 'h', title: 'Logging in', eyebrow: 'Auth' },
  { type: 'p', text: 'Connecting to the MCP server does not authenticate you — that only happens when the login tool is explicitly called with a dashboard username and password, exactly like the dashboard\'s own login form. Every other tool checks for an active session first and refuses with "Not logged in — call the login tool first" until you do.' },
  { type: 'list', variant: 'dot', items: [
    'Tokens are cached in the tools/ process\'s memory, keyed to that one MCP connection — closing the session (or restarting tools/) means logging in again next time.',
    'server/ allows exactly one active session per user account — logging in again with the same username invalidates whatever session (dashboard or another MCP client) was previously active for that account.',
    'Raw tokens are never exposed to the model — tool results only ever contain a success message or the REST response body.',
  ]},
  { type: 'callout', tone: 'warn', title: 'One session per account', text: 'If you are also logged into the dashboard as the same user, logging in via an MCP tool will silently sign that dashboard session out, and vice versa. Use a dedicated account for AI-agent access if you want both running at once.' },

  { type: 'h', title: 'Health-gated, always', eyebrow: 'Reliability' },
  { type: 'p', text: 'Every tool call checks GET /api/health first (cached ~3s to stay cheap). If MongoDB, Redis, RabbitMQ, or the API itself is down, you get a clear "server is not healthy" error instead of a confusing connection failure. check_server_health and get_server_info work without logging in at all, so they double as a first diagnostic step.' },

  { type: 'h', title: '55 tools across 8 groups', eyebrow: 'Reference' },
  { type: 'table', head: ['Group', 'Tools', 'Covers'], grid: '1.1fr .5fr 2.4fr', rows: [
    { key: 'Auth', cells: ['4', 'login, logout, change_password, verify_session'] },
    { key: 'Domains & DNS', cells: ['7', 'Domain and DNS record (A/CNAME/AAAA) CRUD'] },
    { key: 'Users & Roles', cells: ['12', 'User accounts, roles, and the permission catalog'] },
    { key: 'Access Control', cells: ['17', 'Blocking policies, domain groups, IP groups — the largest group'] },
    { key: 'DHCP', cells: ['2', 'List / refresh connected LAN IP addresses'] },
    { key: 'Settings', cells: ['6', 'DNS service toggle, default TTL, cache management'] },
    { key: 'Analytics & Logs', cells: ['5', 'Dashboard stats, query logs, async log export'] },
    { key: 'Meta (no login)', cells: ['2', 'get_server_info, check_server_health'] },
  ]},

  { type: 'divider' },
  { type: 'h', title: 'Connecting AI agents', eyebrow: 'Integrations', sub: 'Every client below uses http://localhost:4774/mcp — that only works if the agent runs on the same machine as tools/. Verified against each tool\'s current docs.' },
  { type: 'callout', tone: 'info', title: 'Connecting from a different device? Find your server\'s own LAN IP first', text: 'There is no fixed IP — every install is on a different network. On the machine running tools/, run hostname -I (or ip -4 addr show) and use whatever address it prints instead of localhost. No extra setup needed: the Host-header allowlist already auto-discovers every LAN IP assigned to that machine at startup, so replacing localhost with it just works.' },
  { type: 'code', code: 'claude mcp add --transport http nexoraldns http://<your-server-LAN-IP>:4774/mcp', label: 'run on the OTHER device, from step 1 above', prompt: false },
  { type: 'callout', tone: 'danger', title: 'Change the default password — highly recommended', text: 'Every "say this" prompt below uses admin / admin, the seed default for a fresh install. Leaving it unchanged means anyone who can reach 4774 or 4773 on your LAN can log in with a widely-known password. Change it immediately — right from your agent, after logging in:' },
  { type: 'code', code: CHANGE_PASSWORD_PROMPT, label: 'say this, right after logging in', prompt: false },
  { type: 'p', text: 'Then swap your new username and password into every "say this" prompt below.' },

  { type: 'h', title: 'Claude Code' },
  { type: 'code', code: 'claude mcp add --transport http nexoraldns http://localhost:4774/mcp', label: 'bash' },
  { type: 'p', text: 'Verify with claude mcp get nexoraldns — should show Status: ✔ Connected. Then open Claude Code and type:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in Claude Code', prompt: false },

  { type: 'h', title: 'Codex CLI' },
  { type: 'code', code: 'codex mcp add nexoraldns --url http://localhost:4774/mcp', label: 'bash' },
  { type: 'p', text: 'Real CLI add command, config stored in ~/.codex/config.toml. Then open Codex and type:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in Codex', prompt: false },

  { type: 'h', title: 'GitHub Copilot CLI' },
  { type: 'p', text: 'No documented single-line flag command — use one of these two instead.' },
  { type: 'code', code: '/mcp add', label: 'inside a copilot session', prompt: false },
  { type: 'p', text: 'Fill the form: Name = nexoraldns, Type = HTTP, URL = http://localhost:4774/mcp. Or edit the config file directly:' },
  { type: 'code', code: `{
  "mcpServers": {
    "nexoraldns": {
      "type": "http",
      "url": "http://localhost:4774/mcp"
    }
  }
}`, label: '~/.copilot/mcp-config.json', prompt: false },
  { type: 'p', text: 'Then open Copilot CLI and type:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in Copilot CLI', prompt: false },

  { type: 'h', title: 'Antigravity (IDE)' },
  { type: 'p', text: 'Settings → Customizations tab → "Open MCP Config". Note the key is serverUrl, not url — different from every other client here.' },
  { type: 'code', code: `{
  "mcpServers": {
    "nexoraldns": {
      "serverUrl": "http://localhost:4774/mcp"
    }
  }
}`, label: 'mcp_config.json', prompt: false },
  { type: 'p', text: 'Save, hit refresh in the Installed MCP Servers panel, then open a chat and type:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in Antigravity', prompt: false },

  { type: 'h', title: 'Antigravity CLI' },
  { type: 'p', text: 'Same serverUrl format, shared or CLI-specific config file (no add command):' },
  { type: 'kv', items: [
    { k: 'Unified (IDE + CLI)', v: '~/.gemini/config/mcp_config.json' },
    { k: 'CLI-specific', v: '~/.gemini/antigravity-cli/mcp_config.json' },
    { k: 'Project-scoped', v: '.agents/mcp_config.json' },
  ]},
  { type: 'p', text: 'Confirm with /mcp inside a session, then type:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in Antigravity CLI', prompt: false },

  { type: 'h', title: 'OpenCode' },
  { type: 'callout', tone: 'warn', title: 'Likely won\'t connect yet', text: 'OpenCode\'s "remote" MCP type currently implements the older SSE transport, not the Streamable HTTP transport tools/ uses — there\'s an open OpenCode feature request for Streamable HTTP support. This config is what OpenCode documents today; test before relying on it.' },
  { type: 'code', code: `{
  "mcp": {
    "nexoraldns": {
      "type": "remote",
      "url": "http://localhost:4774/mcp"
    }
  }
}`, label: 'opencode.json', prompt: false },
  { type: 'p', text: 'If it connects, the same prompt logs you in:' },
  { type: 'code', code: LOGIN_PROMPT, label: 'say this in OpenCode', prompt: false },

  { type: 'h', title: 'Any other MCP client' },
  { type: 'p', text: 'If it supports the Streamable HTTP transport (the current MCP spec standard), the same URL works the same way — including the login flow, since that\'s implemented once in tools/\'s own tool logic, not per-client.' },

  { type: 'next', title: 'See also', items: [
    { icon: '🧬', title: 'Architecture', href: '/docs/architecture' },
    { icon: '🔌', title: 'API Reference', href: '/docs/api' },
    { icon: '🔒', title: 'Security', href: '/docs/security' },
  ]},
];

export default function McpServerPage() {
  return (
    <DocPage
      group="Integrations"
      title="MCP Server"
      badge="LAN only"
      intro="Control NexoralDNS from any AI agent on your local network — Claude Code, Codex, Copilot, Antigravity, and more — through the same login and permissions as the dashboard."
      blocks={blocks}
    />
  );
}
