FROM ubuntu:latest

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Update system and install required tools
RUN apt-get update && \
    apt-get install -y \
    curl \
    sudo \
    net-tools \
    iputils-ping \
    iproute2 \
    wireless-tools \
    network-manager \
    nmcli \
    dnsutils \
    traceroute \
    build-essential \
    git \
    vim \
    nano && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    node -v && npm -v

# Create app directory
WORKDIR /app

# Copy project files
COPY . .

# ---- Build server ----
WORKDIR /app/server
RUN npm install && npm run build

# ---- Build client (Next.js) ----
WORKDIR /app/client
RUN npm install && npm run build

# ---- Build DNS Web component ----
WORKDIR /app/Web
RUN npm install && npm run build

# ---- Install PM2 globally ----
WORKDIR /app
RUN npm install -g pm2

# Set production environment
ENV NODE_ENV=production

# Expose DNS ports
EXPOSE 53/udp 53/tcp

# Grant permission for ping (ICMP requires CAP_NET_RAW)
# Also ensures node can use it without sudo
RUN setcap cap_net_raw+ep /bin/ping

# Start PM2 (client + server) first, then run DNS service from /app/Web
ENTRYPOINT ["sh","-lc","cd /app && pm2 start ecosystem.config.js && exec \"$@\""]
CMD ["sudo", "node", "./Web/lib/cluster/Cluster.js"]