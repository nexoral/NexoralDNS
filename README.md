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
- Real-time DNS traffic monitoring and analytics (7-day retention)
- Access control with per-device, per-group or network-wide blocking
- DNS over UDP, TCP and TLS (DoT)
- Connected-device inventory for the whole LAN
- Web dashboard at `http://localhost:4000`
- MCP tool server for LLM/agent integration
- Role-based access control with 22 granular permissions

---

## Features

| Feature | Description |
|---------|-------------|
| **Custom Domains** | Create internal domains without external DNS servers |
| **Traffic Monitoring** | Query logging and analytics, 7-day automatic retention |
| **Access Control** | Block domains per IP, per IP group, or network-wide |
| **Domain & IP Groups** | Group devices and domains into reusable policies |
| **Anti-Porn Group** | Pre-seeded group of 92 adult content domains |
| **Anti-Ads Group** | Pre-seeded group of 155 advertising and tracking domains |
| **Anti-AI Group** | Pre-seeded group of 42 AI chatbot and generative-tool domains |
| **DNS over TLS** | Encrypted DNS on port 853, self-signed cert generated automatically |
| **Device Inventory** | Automatic LAN sweep every 2 minutes with reverse-DNS and ARP enrichment |
| **RBAC** | 22 permissions, 5 seeded roles, custom roles from any subset |
| **REST API** | Full admin API on port 4773, Swagger UI at `/docs` |
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

In-repo documentation:

| Document | Contents |
|----------|----------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design, query flow, data model, known gaps |
| [`FEATURES.md`](FEATURES.md) | Complete technical feature inventory |
| [`SECURITY.md`](SECURITY.md) | Security model and hardening guidance |
| [`Web/README.md`](Web/README.md) | Go DNS engine internals and a query walkthrough |
| [`AGENTS.md`](AGENTS.md) | Operating manual for AI coding agents |

Per-module agent guides, each carrying that stack's conventions and boundaries:

[`Web/AGENTS.md`](Web/AGENTS.md) · [`server/AGENTS.md`](server/AGENTS.md) ·
[`client/AGENTS.md`](client/AGENTS.md) · [`tools/AGENTS.md`](tools/AGENTS.md) ·
[`DHCP/AGENTS.md`](DHCP/AGENTS.md) · [`Test/AGENTS.md`](Test/AGENTS.md)

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

## Architecture at a glance

| Component | Technology | Port |
|-----------|-----------|------|
| Core DNS engine | Go, UDP/TCP/DoT | 53, 853 |
| Admin REST API | Fastify (TypeScript) | 4773 |
| Dashboard | Next.js | 4000 |
| MCP tool server | Express + MCP SDK | 4774 |
| Backing services | MongoDB, Redis, RabbitMQ | — |

The DNS query path is a **4-layer pipeline**: service status → access control →
local record (Redis, then MongoDB) → upstream forward. Failures degrade policy
enforcement rather than resolution — a LAN losing all DNS is worse than
temporarily missing a blocklist.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full design.

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
