FROM node:22-alpine

# Install sudo (Node.js already included in base image)
RUN apk add --no-cache sudo

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