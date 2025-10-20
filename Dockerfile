FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

# Update system and install required networking tools
RUN apt-get update && \
    apt-get install -y \
    curl \
    sudo \
    net-tools \
    iputils-ping \
    iproute2 \
    wireless-tools \
    network-manager \
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

# Create workspace
WORKDIR /app
COPY . .

# ---- Build server ----
WORKDIR /app/server
RUN npm install && npm run build

# Build Broker
WORKDIR /app/Broker
RUN npm install && npm run build

# ---- Build client ----
WORKDIR /app/client
RUN npm install && npm run build

# ---- Build DHCP Client ----
WORKDIR /app/DHCP
RUN npm install && npm run build

# ---- Build DNS Web component ----
WORKDIR /app/Web
RUN npm install && npm run build

# ---- Install PM2 globally ----
WORKDIR /app
RUN npm install -g pm2

# Allow ping to run without root
RUN setcap cap_net_raw+ep /bin/ping

# Allow node to bind to low ports
RUN sudo setcap cap_net_bind_service,cap_dac_override+ep $(which node)

# Set production mode
ENV NODE_ENV=production

# Expose DNS ports
EXPOSE 53/udp 53/tcp

# Start PM2 (client + server) and run DNS service
ENTRYPOINT ["sh", "-lc", "cd /app && sudo pm2 start ecosystem.config.js && exec \"$@\""]
CMD ["sudo", "node", "./Web/lib/cluster/Cluster.js"]