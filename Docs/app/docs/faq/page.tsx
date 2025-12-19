import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ - NexoralDNS Documentation",
  description: "Frequently asked questions about NexoralDNS. Find answers to common questions about installation, configuration, and usage.",
};

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is NexoralDNS?",
        a: "NexoralDNS is a self-hosted DNS management and surveillance system designed for local area networks (LANs). It allows you to monitor all DNS traffic, create custom internal domains, block unwanted domains, and gain complete visibility into your network's DNS requests."
      },
      {
        q: "Is NexoralDNS free to use?",
        a: "Yes, NexoralDNS is open source and free to use for personal and commercial purposes within your local network. Some advanced features may be available as premium add-ons in the future."
      },
      {
        q: "Can I use NexoralDNS on cloud servers?",
        a: "No! NexoralDNS is strictly designed for LAN use only. Hosting it on cloud platforms or exposing it to the public internet will result in DNS spoofing detection by ISPs, automatic blocking, and potential legal issues. Always keep NexoralDNS within your private network."
      },
      {
        q: "What are the system requirements?",
        a: "NexoralDNS requires Docker and Docker Compose. It runs on any system that supports Docker, including Linux, macOS, and Windows. Minimum recommended specs: 2GB RAM, 2 CPU cores, and 10GB storage."
      }
    ]
  },
  {
    category: "Installation",
    questions: [
      {
        q: "How do I install NexoralDNS?",
        a: "Installation is simple! Just run: curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash - This will automatically install Docker if needed, download the latest version, and start all services."
      },
      {
        q: "How do I update to the latest version?",
        a: "Run the update command: curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update This will pull the latest images and restart services while preserving your data."
      },
      {
        q: "Can I run NexoralDNS alongside Pi-hole or AdGuard?",
        a: "While technically possible, it's not recommended as they would compete for port 53. NexoralDNS includes ad-blocking capabilities, so you likely won't need another DNS-based ad blocker."
      },
      {
        q: "How do I completely remove NexoralDNS?",
        a: "Run the remove command: curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s remove This will stop all services, remove containers, and optionally delete all data."
      }
    ]
  },
  {
    category: "Configuration",
    questions: [
      {
        q: "How do I access the dashboard?",
        a: "After installation, the dashboard is available at http://localhost:4000 or http://<your-server-ip>:4000 from other devices on your network."
      },
      {
        q: "How do I configure my router to use NexoralDNS?",
        a: "Log into your router's admin panel, find the DNS settings (usually under LAN or DHCP settings), and set the primary DNS server to the IP address of the machine running NexoralDNS. The DNS port is 53."
      },
      {
        q: "How do I create a custom domain?",
        a: "In the dashboard, go to Domains → Add Domain. Enter your custom domain (e.g., myapp.local) and point it to any IP address on your network. The domain will be immediately available to all devices using NexoralDNS."
      },
      {
        q: "Can I import blocklists for ad blocking?",
        a: "Yes! NexoralDNS supports importing blocklists in various formats. Go to Dashboard → Block Lists → Import and add URLs to popular blocklists like Steven Black's hosts list or EasyList."
      }
    ]
  },
  {
    category: "Troubleshooting",
    questions: [
      {
        q: "DNS queries are not being resolved",
        a: "Check if the NexoralDNS container is running (docker ps). Ensure port 53 is not being used by another service (sudo lsof -i :53). Verify your device or router is configured to use NexoralDNS as the DNS server."
      },
      {
        q: "The dashboard is not loading",
        a: "Ensure the web container is running. Check if port 4000 is accessible. Try accessing from localhost first. Check container logs: docker logs nexoraldns-web"
      },
      {
        q: "Custom domains are not working",
        a: "Verify the domain is correctly configured in the dashboard. Flush DNS cache on your device (ipconfig /flushdns on Windows, sudo dscacheutil -flushcache on macOS). Ensure the device is using NexoralDNS as its DNS server."
      },
      {
        q: "How do I view logs for debugging?",
        a: "Use docker logs to view container logs: docker logs nexoraldns-server for DNS server logs, docker logs nexoraldns-web for dashboard logs. You can also view real-time logs with the -f flag."
      }
    ]
  },
  {
    category: "Security",
    questions: [
      {
        q: "Is my DNS data private?",
        a: "Yes! NexoralDNS is completely self-hosted. Your DNS queries never leave your network. No data is sent to external servers. You have complete control over your DNS data."
      },
      {
        q: "Does NexoralDNS support DNS over HTTPS (DoH)?",
        a: "NexoralDNS supports upstream DNS over HTTPS when forwarding queries to external DNS servers like Cloudflare or Google. This ensures your external queries are encrypted."
      },
      {
        q: "How do I secure the dashboard?",
        a: "The dashboard requires authentication by default. Make sure to change the default password after installation. For additional security, you can configure HTTPS using a reverse proxy like nginx or Traefik."
      }
    ]
  },
  {
    category: "Performance",
    questions: [
      {
        q: "What is the typical response time?",
        a: "NexoralDNS achieves sub-5ms response times for cached queries thanks to Redis caching. First-time queries that need to be forwarded upstream may take 20-50ms depending on your upstream DNS provider."
      },
      {
        q: "How many queries can NexoralDNS handle?",
        a: "NexoralDNS is designed for home and small business networks. It can easily handle thousands of queries per second, more than enough for networks with hundreds of devices."
      },
      {
        q: "Does NexoralDNS consume a lot of resources?",
        a: "No, NexoralDNS is lightweight. Typical memory usage is around 500MB-1GB including all containers. CPU usage is minimal during normal operation."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions about NexoralDNS. Can&apos;t find what you&apos;re looking for?{" "}
            <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">
              Contact us
            </Link>
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {faqs.map((category) => (
            <a
              key={category.category}
              href={`#${category.category.toLowerCase()}`}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-full text-sm text-gray-400 hover:text-white hover:border-gray-700 transition-all duration-200"
            >
              {category.category}
            </a>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {faqs.map((category) => (
            <section key={category.category} id={category.category.toLowerCase()}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                  {category.category === "General" && "📖"}
                  {category.category === "Installation" && "⚡"}
                  {category.category === "Configuration" && "⚙️"}
                  {category.category === "Troubleshooting" && "🔧"}
                  {category.category === "Security" && "🔒"}
                  {category.category === "Performance" && "🚀"}
                </span>
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, index) => (
                  <details
                    key={index}
                    className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all duration-200"
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h3 className="font-semibold text-white pr-4">{faq.q}</h3>
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </summary>
                    <p className="mt-4 text-gray-400 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Still Need Help */}
        <div className="mt-16 p-8 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Can&apos;t find the answer you&apos;re looking for? Our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Contact Us
            </Link>
            <a
              href="https://github.com/nexoral/NexoralDNS/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
            >
              Ask the Community
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
