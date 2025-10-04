FROM ubuntu:22.04

# Install sudo (and optional libc6-compat for Next.js binaries)
RUN apt-get update && apt-get install -y sudo libc6-compat
RUN apt-get install -y curl wget vim git build-essential nmcli net-tools

# Base workspace
WORKDIR /app
COPY . .

# Build server (Fastify Server)
WORKDIR /app/server
RUN npm install && npm run build

# Build client (Next.js)
WORKDIR /app/client
RUN npm install && npm run build

# Install PM2 globally
WORKDIR /app
RUN npm install -g pm2

# Build DNS Web component
WORKDIR /app/Web
RUN npm install && npm run build

# Now set production env for runtime
ENV NODE_ENV=production

# Expose DNS ports
EXPOSE 53/udp 53/tcp

# Start PM2 (client + server) first, then run DNS service from /app/Web
ENTRYPOINT ["sh","-lc","cd /app && pm2 start ecosystem.config.js && exec \"$@\""]
CMD ["sudo", "node", "./Web/lib/cluster/Cluster.js"]