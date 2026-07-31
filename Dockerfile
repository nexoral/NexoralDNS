# Go build stage — Web/ is the core DNS server, a Go module rather than an npm
# package. Built on its own so the Node stage never sees it and the toolchain
# never reaches the runtime image.
FROM golang:1.26-alpine AS go-builder

WORKDIR /src

# Dependencies first, so a source-only change reuses the cached module layer.
COPY Web/go.mod Web/go.sum ./
RUN go mod download

COPY Web/ ./

# Static binary: no libc dependency, so it runs on the Ubuntu runtime image.
# -trimpath drops build paths; -s -w strips debug info to shrink the binary.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/web .

# Node build stage
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
# full copy, not just package.json: its prepare script needs real source to compile
COPY shared ./shared
COPY DHCP/package.json ./DHCP/package.json

RUN npm ci --no-audit --no-fund

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci --no-audit --no-fund

COPY tools/package.json tools/package-lock.json ./tools/
RUN cd tools && npm ci --no-audit --no-fund

COPY . .

RUN cd server && npm run build && npm prune --production
RUN cd client && npm run build && npm prune --production
RUN cd DHCP && npm run build && npm prune --production
RUN cd tools && npm run build && npm prune --production

# Runtime stage
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y curl sudo libcap2-bin dnsutils iputils-ping iproute2 && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pm2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/lib ./shared/lib
COPY --from=builder /app/shared/package.json ./shared/

COPY --from=builder /app/server/lib ./server/lib
COPY --from=builder /app/server/package.json ./server/

COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/node_modules ./client/node_modules
COPY --from=builder /app/client/package.json ./client/
COPY --from=builder /app/client/public ./client/public

COPY --from=builder /app/DHCP/lib ./DHCP/lib
COPY --from=builder /app/DHCP/package.json ./DHCP/

COPY --from=go-builder /out/web ./Web/web

COPY --from=builder /app/tools/lib ./tools/lib
COPY --from=builder /app/tools/node_modules ./tools/node_modules
COPY --from=builder /app/tools/package.json ./tools/

COPY --from=builder /app/Scripts ./Scripts
COPY --from=builder /app/ecosystem.config.js ./

RUN setcap cap_net_raw+ep /bin/ping && \
    setcap cap_net_bind_service,cap_dac_override+ep $(which node) && \
    chmod +x ./Web/web ./Scripts/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 53/udp 53/tcp 853/tcp 4000 4773 4774

CMD ["./Scripts/docker-entrypoint.sh"]
