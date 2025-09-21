# NexoralDNS

## Overview
NexoralDNS is a powerful DNS surveillance and management system designed for local area networks. This repository contains the agent component that can be installed on any machine within a LAN to provide custom DNS functionality for the entire network.

## What is NexoralDNS?
NexoralDNS is a Software-as-a-Service (SaaS) solution that allows system administrators to:
- Monitor all DNS traffic within their network
- Create and manage custom domain names for internal resources
- Control and filter DNS requests for enhanced security
- Provide detailed analytics on network DNS usage
- Simplify local development environments with custom domain routing

## How It Works
1. The NexoralDNS agent is installed on any machine within your LAN
2. System administrators configure the network's default DNS settings to point to the machine running NexoralDNS
3. All DNS requests within the network are now routed through NexoralDNS
4. Administrators can define custom domain rules through the management interface
5. The system logs and monitors all DNS traffic for surveillance purposes

## Key Features
- **Custom Domain Management**: Create and manage internal domains without modifying external DNS servers
- **DNS Traffic Monitoring**: Comprehensive logging of all DNS requests within the network
- **Easy Deployment**: Simple installation process on any network-connected machine
- **Web-based Management**: Intuitive interface for managing DNS rules and viewing analytics
- **Security Filtering**: Block malicious domains and protect your network
- **Developer-Friendly**: Simplify development environments with custom domain routing

## Installation

### Requirements
- Any machine running on your LAN network (Linux, Windows, or macOS)
- Node.js v14 or higher
- Network administrator privileges to modify DNS settings

### Setup Process
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/NexoralDNS.git
   ```

2. Install dependencies:
   ```
   cd NexoralDNS
   npm install
   ```

3. Configure the agent:
   ```
   npm run configure
   ```

4. Start the DNS agent:
   ```
   npm run start
   ```

5. Configure your network router to use the IP address of the machine running NexoralDNS as the primary DNS server.

## Configuration
The configuration file is located at `config/settings.json`. Here you can define:
- Custom domain mappings
- Logging preferences
- Access controls
- Filtering rules

## Use Cases
- **Development Environments**: Create custom `.local` or `.dev` domains for your development projects
- **Small Business Networks**: Provide easy-to-remember domain names for internal services
- **Network Security**: Monitor and control DNS traffic to enhance security
- **Educational Institutions**: Manage access to web resources within a school network

## Dashboard Access
Access the management dashboard at `http://[NexoralDNS-IP]:8080/dashboard` after installation.

## License
[MIT License](LICENSE)

## Support
For questions or support, please open an issue in this repository or contact support@nexoraldns.com.
