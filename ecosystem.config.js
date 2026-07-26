module.exports = {
  apps: [
    // server (Fastify) — runs from /server
    {
      name: 'server',
      script: 'npm',
      args: 'run start',
      cwd: '/app/server',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/server.log',
      error_file: '/var/log/server.err.log',
      restart_delay: 5000,
      max_restarts: 3,
      user: 'nobody'
    },
    // client (frontend) — runs from /client
    {
      name: 'client',
      script: 'npm',
      args: 'run start',
      cwd: '/app/client',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/client.log',
      error_file: '/var/log/client.err.log',
      restart_delay: 5000,
      max_restarts: 3,
      user: 'nobody'
    },
    // dhcp (network scan broker) — runs from /DHCP
    {
      name: 'dhcp',
      script: 'sudo',
      args: 'npm run start',
      cwd: '/app/DHCP',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/dhcp.log',
      error_file: '/var/log/dhcp.err.log',
      restart_delay: 5000,
      max_restarts: 3
    },
    // web (Core DNS Server) — runs from /Web
    {
      name: 'web',
      script: 'sudo',
      args: 'npm run start',
      cwd: '/app/Web',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/web.log',
      error_file: '/var/log/web.err.log',
      restart_delay: 5000,
      max_restarts: 3
    },
    // tools (MCP tool server) — runs from /tools, calls server's REST API over loopback
    {
      name: 'tools',
      script: 'npm',
      args: 'run start',
      cwd: '/app/tools',
      // MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL lets the OAuth sign-in flow run
      // over plain http on a LAN address. Without it the MCP SDK refuses any
      // non-https issuer that isn't localhost and the process exits at startup, so
      // only a client on this same machine could ever authenticate. With it set,
      // MCP_PUBLIC_URL defaults to this machine's own LAN IP (see core/key.ts), so
      // agents on other devices work with no further configuration.
      //
      // Cost: the sign-in page and every token then cross the LAN unencrypted.
      // Put this behind TLS and set MCP_PUBLIC_URL to the https origin instead if
      // your network isn't trusted.
      env: {
        NODE_ENV: 'production',
        MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL: 'true'
      },
      out_file: '/var/log/tools.log',
      error_file: '/var/log/tools.err.log',
      restart_delay: 5000,
      max_restarts: 3,
      user: 'nobody'
    }
  ]
};
