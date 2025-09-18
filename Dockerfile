FROM node:22-alpine

# Install sudo (and optional libc6-compat for Next.js binaries)
RUN apk add --no-cache sudo libc6-compat

# Base workspace
WORKDIR /app
COPY . .

# Build server (NestJS)
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
CMD ["sudo", "node", "./Web/lib/Config/DNS.js"]