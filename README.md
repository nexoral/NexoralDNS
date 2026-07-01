# 🚀 NexoralDNS

**Advanced DNS Management & Surveillance System**

![Version](https://img.shields.io/badge/version-Latest%20Stable-brightgreen)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Docker](https://img.shields.io/badge/docker-supported-blue)

---

## ⚡ Quick Installation

**One-command installation:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -
```

> ✅ **That's it!** The script will automatically install Docker, download the latest version, and start the NexoralDNS server.

**Start services:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start
```

> ▶️ **Start NexoralDNS services** if they are stopped.

**Stop services:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop
```

> ⏹️ **Stop all NexoralDNS services** without removing the installation.

**Complete removal:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s remove
```

**Update services:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update
```

> 🗑️ **This will completely remove NexoralDNS** including all configurations, services, and data.

---

## ⚠️ **IMPORTANT WARNING - LAN USE ONLY**

**🚨 DO NOT HOST THIS ON THE CLOUD OR PUBLIC INTERNET 🚨**

NexoralDNS is **STRICTLY** designed for **Local Area Network (LAN)** use only.

**Why you should NEVER use this on cloud/public hosting:**

- ⛔ **DNS Spoofing Detection:** Your ISP will detect this as DNS spoofing activity
- 🔒 **Automatic Blocking:** ISPs will automatically block your DNS server
- 🔀 **Traffic Redirection:** All DNS traffic will be forcibly routed to your ISP's DNS servers
- 💔 **Service Disruption:** Your service will become completely non-functional
- ⚖️ **Potential Legal Issues:** May violate ISP terms of service

**✅ Correct Usage:**
- Install on a local machine within your LAN (home/office network)
- Configure your local router to use this DNS server
- Use only for internal network traffic and custom domain resolution

**❌ Incorrect Usage:**
- Hosting on cloud platforms (AWS, Azure, Google Cloud, DigitalOcean, etc.)
- Using as a public DNS resolver
- Exposing port 53 to the public internet

**This warning applies to all deployment scenarios. Always ensure NexoralDNS remains within your private network boundaries.**

---

## 🎯 What is NexoralDNS?

NexoralDNS is a **Software-as-a-Service (SaaS)** solution that transforms your network's DNS infrastructure. It provides comprehensive DNS management, monitoring, and custom domain resolution for your entire Local Area Network (LAN).

---

## 🤔 Why Do You Need NexoralDNS?

### 🔒 Enhanced Security
- Monitor all DNS traffic within your network
- Block malicious domains and protect against DNS-based threats
- Get real-time alerts on suspicious DNS activity

### 🏠 Local Development
- Create custom domains like `myapp.local` for development
- No need to modify host files on every machine
- Seamless team collaboration with shared custom domains

### 📊 Network Monitoring
- Detailed analytics on DNS usage and popular domains
- Track network activity patterns
- Identify bandwidth-heavy applications

### 🎛️ Centralized Control
- Manage DNS settings for your entire network from one interface
- Easy configuration without touching individual devices
- Backup and restore DNS configurations

---

## ✨ Key Features

- **🌐 Custom Domain Management:** Create internal domains without external DNS servers
- **📈 DNS Traffic Monitoring:** Comprehensive logging and real-time analytics
- **🐳 Easy Deployment:** One-command installation via Docker
- **🖥️ Web-based Management:** Intuitive dashboard accessible at `localhost:4000`
- **🛡️ Security Filtering:** Block unwanted domains and protect your network
- **🔞 Anti-Porn Mode:** Block 100+ adult content websites with one click - perfect for families and schools
- **🛡️ Anti-Ads Mode:** Block 200+ advertising and tracking domains - eliminate ads, protect privacy, and speed up browsing
- **🤖 Anti-AI Mode:** Block major AI chatbot, coding assistant, and generative-AI domains (ChatGPT, Claude, Gemini, Copilot, and more) - ideal for schools, exams, and workplaces
- **👥 Users & Roles (RBAC):** Create custom roles from a fixed permission catalog, add admin-managed users with a temporary password, and enforce a forced password change on first login
- **👨‍💻 Developer-Friendly:** Perfect for development environments
 - **📊 Real-time Analytics:** Monitor DNS queries as they happen
 - **☁️ Cloud Integration:** Sync settings across multiple installations

---

## 🔧 How It Works

1. **Install:** Run the installation command on any machine in your LAN
2. **Configure Router:** Set your router's DNS to point to the NexoralDNS machine
3. **Activate:** Use the web interface to activate with your cloud key
4. **Manage:** Create custom domains and monitor traffic through the dashboard

---

## 🛠️ Manual Installation (Alternative)

If you prefer manual installation or want to contribute to development:

### 1. Clone Repository
```bash
git clone https://github.com/nexoral/NexoralDNS.git
cd NexoralDNS
```

### 2. Start with Docker Compose
```bash
cd Scripts
sudo docker compose up -d
```

### Requirements
- Docker and Docker Compose installed
- Sudo/Administrator privileges
- Network access to configure router DNS settings

---

## 🌐 Post-Installation Setup

1. **Access Web Interface:** Open `http://localhost:4000`
2. **Login:** Username: `admin`, Password: `admin`
3. **Change Password:** Update default credentials immediately
4. **Activate Service:** Enter your activation key from the cloud platform
5. **Configure Router:** Set DNS server to your machine's IP address
6. **Set Static IP:** Reserve IP address in router to prevent DNS interruption

7. **Create custom domains & blocking rules:**

- Use the web interface to create custom internal domains (for example `myapp.ankan`) that resolve only within your LAN.
- Create blocking rules to block specific domains either for individual IP addresses or for the entire network. This is useful for parental controls, IoT protection, or blocking malicious domains.
- **Enable Anti-Porn Mode** with one click to automatically block 100+ adult content websites for specific devices, groups, or your entire network (Access Control → Anti-Porn Mode).
- **Enable Anti-Ads Mode** with one click to automatically block 200+ advertising and tracking domains including Google Ads, Facebook tracking, and more - improve privacy and browsing speed (Access Control → Anti-Ads Mode).
- **Enable Anti-AI Mode** to automatically block major AI chatbot, AI coding assistant, and generative-AI tool domains (ChatGPT, Claude, Gemini, Copilot, Perplexity, Character.AI, Midjourney, and more) - useful for schools, exam environments, and workplaces that need to restrict AI tool access (Access Control → Anti-AI Mode).

---

## 💡 Use Cases

### 🏢 Small Business
- Easy-to-remember domain names for internal services
- Enhanced network security and monitoring
- Centralized DNS management for all employees

### 👨‍💻 Development Teams
- Custom `.local` or `.dev` domains for development projects
- No more host file modifications across team machines
- Simplified development environment setup

### 🏫 Educational Institutions
- Manage and monitor student access to web resources
- **One-click anti-porn mode** to block adult content across campus
- **One-click anti-ads mode** to block ads and improve network bandwidth
- Filter inappropriate content automatically
- Track network usage patterns

### 🏠 Home Networks
- **Anti-porn mode for family safety** - protect kids with one click
- **Anti-ads mode for privacy and speed** - block 200+ ad/tracking domains
- Parental controls and device monitoring
- Custom domain management for smart homes
- Enhanced security for IoT devices

---

## 📋 System Requirements
- **Operating System:** Linux Debian/Ubuntu
- **Memory:** Minimum 1GB RAM (Docker will be installed and requires additional memory)
- **Storage:** Minimum 4GB free space
- **Network:** LAN connectivity
- **Privileges:** Administrator/root access for installation

---

## 🔗 Links & Resources

- **Dashboard:** `http://[server-ip]:4000`
- **GitHub Repository:** [https://github.com/nexoral/NexoralDNS](https://github.com/nexoral/NexoralDNS)
- **Documentation:** Available in the web interface
- **Support:** Open an issue on GitHub

---

## 📜 License

Proprietary Source-Available License - See [LICENSE](LICENSE) file for details.

**Free to use with limited features. Full features require a commercial license from [nexoral.in](https://nexoral.in)**

Source code is available for reference and learning purposes only. Modifications are not permitted.

---

## 🤝 Contributing

We welcome bug reports, feature requests, and security vulnerability reports! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Note: This is source-available software. Code contributions are not accepted, but we highly value your feedback and issue reports.

---

> **🎉 Ready to get started?** Run the installation command and transform your network's DNS in minutes!

---

## 🆘 Troubleshooting

### Common Issues

**DNS not working after installation:**
- Ensure your router's DNS is set to the NexoralDNS machine IP
- Check if the Docker containers are running: `sudo docker compose ps`
- Verify port 53 is not blocked by firewall

**Web interface not accessible:**
- Check if port 4000 is open
- Restart services: `sudo docker compose restart`

**Version updates not working:**
- Ensure internet connectivity
- Check Docker image permissions

**If updates fail or network requests are blocked:**

- If the `update` command fails to fetch new images or the network is restricted, you can remove and reinstall the service as a recovery path:

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -s remove
```

- If removal also fails due to network/DNS problems, re-enable the system resolver and restart it to restore system DNS resolution before retrying:

```bash
sudo systemctl enable systemd-resolved
sudo systemctl restart systemd-resolved
```

- If you still need to manually restore local name resolution, edit `/etc/resolv.conf` and set the nameserver to the local stub resolver:

```bash
sudo nano /etc/resolv.conf
# set or ensure the file contains:
nameserver 127.0.0.53
```

### Complete Uninstallation

If you need to completely remove NexoralDNS from your system:

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -s remove
```

This will:
- Stop all NexoralDNS services
- Remove Docker containers and images
- Delete all configuration files and data
- Clean up the installation directory

> ⚠️ **Warning:** This action is irreversible and will delete all your custom DNS configurations.

---

**Made with ❤️ by the NexoralDNS Team**
