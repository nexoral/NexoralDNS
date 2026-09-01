# NexoralDNS

**Advanced DNS Management & Surveillance System for Local Networks**

<!-- Status Badges -->
[![CI Build](https://github.com/nexoral/NexoralDNS/actions/workflows/push_to_github_registry.yml/badge.svg)](https://github.com/nexoral/NexoralDNS/actions/workflows/push_to_github_registry.yml)
[![Release](https://img.shields.io/github/v/release/nexoral/NexoralDNS)](https://github.com/nexoral/NexoralDNS/releases/latest)
[![License](https://img.shields.io/badge/License-Source--Available-blue)](LICENSE)

<!-- Tech Stack Badges -->
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/nexoral/NexoralDNS/pkgs/container/nexoraldns)
[![Platform](https://img.shields.io/badge/Platform-Linux-FCC624?logo=linux&logoColor=black)](https://www.linux.org/)

<!-- Community Badges -->
[![GitHub Stars](https://img.shields.io/github/stars/nexoral/NexoralDNS?style=social)](https://github.com/nexoral/NexoralDNS/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/nexoral/NexoralDNS?style=social)](https://github.com/nexoral/NexoralDNS/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/nexoral/NexoralDNS)](https://github.com/nexoral/NexoralDNS/issues)
[![GitHub Contributors](https://img.shields.io/github/contributors/nexoral/NexoralDNS)](https://github.com/nexoral/NexoralDNS/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/nexoral/NexoralDNS)](https://github.com/nexoral/NexoralDNS/commits/main)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/AnkanSaha)

---

> **LAN-ONLY** — NexoralDNS is designed exclusively for Local Area Networks. Do **NOT** deploy on cloud platforms or expose to the public internet. ISPs will block DNS spoofing activity and your service will become non-functional.

---

## Why NexoralDNS?

You're working on a project with your team. Your colleague just built a feature on their machine and pushed it — you want to test it, but you don't know their IP address. You could ask, dig through router settings, or spin up an ngrok tunnel — but that's over-engineered for something happening on the same LAN.

**NexoralDNS solves this.** Assign a custom domain like `alice.dev.local` once, and every device on your network resolves it instantly — no IP hunting, no tunnels, no host file edits. It just works.

---

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -
```

**Manage the service:**

| Command | Description |
|---------|-------------|
| `nexoraldns start` | Start all services |
| `nexoraldns stop` | Stop all services |
| `nexoraldns update` | Pull latest Docker images |
| `nexoraldns pack` | Self-update the CLI |
| `nexoraldns remove` | Complete removal (irreversible) |

---

## What is NexoralDNS?

NexoralDNS is a self-hosted DNS management system that transforms your network's DNS infrastructure. It provides custom domain resolution, traffic monitoring, security filtering, and a web-based dashboard — all running locally on your LAN.

**Key capabilities:**
- Custom domain management (e.g., `myapp.local`)
- Real-time DNS traffic monitoring and analytics
- Security filtering with one-click blocking modes
- Web dashboard at `http://localhost:4000`
- MCP tool server for LLM integration
- DHCP server integration (Premium)

---

## Features

| Feature | Description |
|---------|-------------|
| **Custom Domains** | Create internal domains without external DNS servers |
| **Traffic Monitoring** | Comprehensive logging and real-time analytics |
| **Anti-Porn Mode** | Block 100+ adult content websites with one click |
| **Anti-Ads Mode** | Block 200+ advertising and tracking domains |
| **Anti-AI Mode** | Block major AI chatbot and tool domains |
| **RBAC** | Role-based access control with custom roles |
| **MCP Server** | LLM integration via Model Context Protocol (54 tools) |
| **Docker Deployment** | One-command installation via Docker |

See the [full feature comparison](https://dns.nexoral.in/) for Free vs Premium details.

---

## Performance

Measured with `dnsperf` (UDP:53, 49 domains, warm cache):

| Metric | Value |
|--------|-------|
| **Throughput** | **12,746 queries/second** |
| Average latency | 3.8 ms |
| Dropped queries | 0 |

Test hardware: AMD Ryzen 5 5500U (6C/12T), 7.1 GiB RAM, Linux 6.8, Docker `host` networking, with MongoDB/Redis/RabbitMQ co-located.

---

## Quick Start

1. **Install** — Run the installation command above
2. **Access Dashboard** — Open `http://localhost:4000`
3. **Login** — Username: `admin`, Password: `admin` (change immediately)
4. **Configure Router** — Set your router's DNS to the NexoralDNS machine IP
5. **Create Domains** — Use the dashboard to create custom internal domains

For detailed setup instructions, see the [documentation](https://dns.nexoral.in/).

---

## System Requirements

| Requirement | Minimum |
|-------------|---------|
| **OS** | Linux Debian/Ubuntu |
| **RAM** | 1 GB (plus Docker overhead) |
| **Storage** | 4 GB free space |
| **Network** | LAN connectivity |
| **Privileges** | Root/administrator access |

---

## Documentation

Full documentation is available at **[dns.nexoral.in](https://dns.nexoral.in/)**

- Installation guides
- Configuration reference
- API documentation
- Troubleshooting
- Feature comparison (Free vs Premium)

---

## MCP Tool Server

NexoralDNS includes a [Model Context Protocol](https://modelcontextprotocol.io) server for LLM integration. Any MCP-compatible client can manage domains, DNS records, users, and settings via the same authenticated REST API as the dashboard.

- **Endpoint:** `http://<LAN-IP>:4774/mcp`
- **54 tools** covering the full REST surface
- **OAuth 2.1** browser sign-in

See the [MCP documentation](https://dns.nexoral.in/) for setup and usage.

---

## Use Cases

- **Home Networks** — Parental controls, ad blocking, IoT security
- **Development Teams** — Custom `.local` domains without host file edits
- **Small Businesses** — Centralized DNS management and monitoring
- **Educational Institutions** — Content filtering and network oversight

---

## Links

- **Documentation:** [dns.nexoral.in](https://dns.nexoral.in/)
- **Author:** [ankan.in](https://ankan.in)
- **Issues:** [GitHub Issues](https://github.com/nexoral/NexoralDNS/issues)
- **Releases:** [GitHub Releases](https://github.com/nexoral/NexoralDNS/releases)
- **Docker Image:** [ghcr.io/nexoral/nexoraldns](https://github.com/nexoral/NexoralDNS/pkgs/container/nexoraldns)

---

## Contributing

We welcome bug reports, feature requests, and security vulnerability reports. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Note: This is source-available software. Code contributions are not accepted, but feedback and issue reports are valued.

---

## License

Proprietary Source-Available License — see [LICENSE](LICENSE) for details.

Free to use with limited features. Full features require a commercial license from [nexoral.in](https://nexoral.in).

---

**Made with ❤️ by the NexoralDNS Team**
