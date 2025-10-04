FROM ubuntu:latest

# Install Node.js and other dependencies
RUN apt-get update && apt-get install -y curl sudo net-tools nmcli lsof ping
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
RUN sudo apt-get install -y nodejs

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