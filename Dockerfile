# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
COPY . .

# Build all components
RUN cd server && npm ci && npm run build && npm prune --production && \
    cd ../Broker && npm ci && npm run build && npm prune --production && \
    cd ../client && npm ci && npm run build && npm prune --production && \
    cd ../DHCP && npm ci && npm run build && npm prune --production && \
    cd ../Web && npm ci && npm run build && npm prune --production

# Runtime stage
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and minimal runtime dependencies
RUN apt-get update && apt-get install -y curl sudo libcap2-bin dnsutils iputils-ping iproute2 && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pm2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder /app/server/lib ./server/lib
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/

COPY --from=builder /app/Broker/lib ./Broker/lib
COPY --from=builder /app/Broker/node_modules ./Broker/node_modules
COPY --from=builder /app/Broker/package.json ./Broker/

COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/node_modules ./client/node_modules
COPY --from=builder /app/client/package.json ./client/
COPY --from=builder /app/client/public ./client/public

COPY --from=builder /app/DHCP/lib ./DHCP/lib
COPY --from=builder /app/DHCP/node_modules ./DHCP/node_modules
COPY --from=builder /app/DHCP/package.json ./DHCP/

COPY --from=builder /app/Web/lib ./Web/lib
COPY --from=builder /app/Web/node_modules ./Web/node_modules
COPY --from=builder /app/Web/package.json ./Web/

COPY --from=builder /app/Scripts ./Scripts
COPY --from=builder /app/ecosystem.config.js ./

# Set capabilities
RUN setcap cap_net_raw+ep /bin/ping && \
    setcap cap_net_bind_service,cap_dac_override+ep $(which node)

ENV NODE_ENV=production
EXPOSE 53/udp 53/tcp 4000 4773

ENTRYPOINT ["sh", "-lc", "cd /app && sudo pm2 start ecosystem.config.js && exec \"$@\""]
CMD ["sudo", "node", "./Scripts/combineRunner.js"]