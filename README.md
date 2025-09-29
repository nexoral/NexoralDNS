# 🚀 NexoralDNS

**Advanced DNS Management & Surveillance System**

![Version](https://img.shields.io/badge/version-Latest%20Stable-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Docker](https://img.shields.io/badge/docker-supported-blue)

---

## ⚡ Quick Installation

**One-command installation:**

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -
```

> ✅ **That's it!** The script will automatically install Docker, download the latest version, and start the NexoralDNS server.

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
- **👨‍💻 Developer-Friendly:** Perfect for development environments
- **📊 Real-time Analytics:** Monitor DNS queries as they happen
- **☁️ Cloud Integration:** Sync settings across multiple installations
- **🔄 Auto-Updates:** Automatic version management and updates
- **📱 Mobile Responsive:** Manage your DNS from any device

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
- Filter inappropriate content automatically
- Track network usage patterns

### 🏠 Home Networks
- Parental controls and device monitoring
- Custom domain management for smart homes
- Enhanced security for IoT devices

---

## 📋 System Requirements

- **Operating System:** Linux Debian/Ubuntu
- **Memory:** Minimum 512MB RAM
- **Storage:** 1GB free space
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

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines in the repository.

---

> **🎉 Ready to get started?** Run the installation command and transform your network's DNS in minutes!
**Version updates not working:**
- Ensure internet connectivity
- Check Docker image permissions

---

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines in the repository.

---

> **🎉 Ready to get started?** Run the installation command and transform your network's DNS in minutes!

---

**Made with ❤️ by the NexoralDNS Team**
            <div class="feature-card">
                <h3>🏢 Small Business</h3>
                <p>Easy-to-remember domain names for internal services and enhanced network security.</p>
            </div>
            <div class="feature-card">
                <h3>👨‍💻 Development Teams</h3>
                <p>Custom <code>.local</code> or <code>.dev</code> domains for development projects without host file modifications.</p>
            </div>
            <div class="feature-card">
                <h3>🏫 Educational Institutions</h3>
                <p>Manage and monitor student access to web resources within school networks.</p>
            </div>
            <div class="feature-card">
                <h3>🏠 Home Networks</h3>
                <p>Parental controls, device monitoring, and custom domain management for smart homes.</p>
            </div>
        </div>
</body>
</html>
