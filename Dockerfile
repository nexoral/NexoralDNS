FROM ubuntu:22.04

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    sudo \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the entire repository
COPY . .

# Navigate to Web folder, install dependencies and build
WORKDIR /app/Web
RUN npm install
RUN npm run build

# Expose DNS port (typically 53)
EXPOSE 53/udp 53/tcp

# Run the DNS service
CMD ["sudo", "node", "./lib/Config/DNS.js"]