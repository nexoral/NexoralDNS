module.exports = {
  apps: [
    // Message Broker (NodeJS) — runs from /Broker
    {
      name: 'broker',
      script: 'npm',
      args: 'run start',
      cwd: '/app/Broker',
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/server.log',
      error_file: '/var/log/server.err.log',
      restart_delay: 5000,
      max_restarts: 3,
      user: 'nobody'
    },
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
    }
  ]
};
