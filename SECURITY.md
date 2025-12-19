# Security Policy

## Our Commitment to Security

At NexoralDNS, we take security seriously. As DNS infrastructure software, we understand the critical role security plays in protecting your network. We appreciate the security research community's efforts in helping us maintain the highest security standards.

---

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| Latest  | ✅ Yes             | Always recommended |
| 1.x.x   | ✅ Yes             | Current stable branch |
| < 1.0   | ❌ No              | Please upgrade |

**Recommendation:** Always use the latest stable version to ensure you have the latest security patches.

To check your version:
```bash
cat VERSION
```
Or check in the web dashboard under Settings → About.

---

## Reporting a Vulnerability

**⚠️ PLEASE DO NOT REPORT SECURITY VULNERABILITIES THROUGH PUBLIC GITHUB ISSUES**

Public disclosure of security vulnerabilities can put all users at risk. We kindly request that you follow responsible disclosure practices.

### How to Report

We have multiple channels for reporting security vulnerabilities:

#### 1. Primary Method: Email
Send a detailed report to our security team:
- **Email:** security@nexoral.in
- **Subject:** [SECURITY] Brief description of the vulnerability
- **Encryption:** PGP key available at [nexoral.in/security](https://nexoral.in/security) (optional but recommended)

#### 2. For Premium Customers
- Use your priority support channel
- Mark the ticket as **URGENT - SECURITY ISSUE**
- We guarantee faster response times for premium customers

#### 3. GitHub Security Advisories
- Use [GitHub's Private Vulnerability Reporting](https://github.com/nexoral/NexoralDNS/security/advisories/new)
- This creates a private discussion with maintainers

### What to Include in Your Report

To help us understand and address the issue quickly, please include:

1. **Vulnerability Type**
   - Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
   - CWE or CVE reference if applicable

2. **Affected Components**
   - Affected version(s)
   - Affected component (DNS server, web dashboard, API, etc.)
   - Free tier, premium tier, or both

3. **Impact Assessment**
   - Potential impact (data breach, DoS, privilege escalation, etc.)
   - Attack scenario and prerequisites
   - Your assessment of severity (Critical/High/Medium/Low)

4. **Reproduction Steps**
   - Detailed step-by-step instructions to reproduce
   - Proof of concept code (if applicable)
   - Screenshots or videos demonstrating the issue
   - Test environment details

5. **Suggested Mitigation**
   - Any workarounds or temporary fixes
   - Suggested patches (if you have them)

6. **Your Information**
   - Your name and contact information
   - Are you okay with being publicly credited? (Yes/No)
   - Do you want a CVE assigned? (Yes/No)

### Example Report Template

```
Subject: [SECURITY] SQL Injection in DNS Query Log Search

Vulnerability Type: SQL Injection
CWE: CWE-89
Affected Version: 1.2.3
Affected Component: Web Dashboard - Query Log Search
Affected Tier: Both Free and Premium

Impact:
- Allows authenticated users to execute arbitrary SQL queries
- Potential for data exfiltration of all DNS logs
- Severity: HIGH

Steps to Reproduce:
1. Log in to web dashboard at http://localhost:4000
2. Navigate to Query Logs → Search
3. Enter the following payload in search field: ' OR '1'='1
4. Observe SQL error message revealing database structure

Proof of Concept:
[paste PoC code or screenshots]

Suggested Mitigation:
Use parameterized queries instead of string concatenation in
/server/source/Router/QueryLog/search.ts line 45

Reporter: John Doe (john@example.com)
Public Credit: Yes
CVE Request: Yes
```

---

## Response Timeline

We are committed to responding quickly to security reports:

| Stage | Free Tier | Premium Tier |
|-------|-----------|--------------|
| **Initial Response** | Within 5 business days | Within 24 hours |
| **Status Update** | Weekly | Every 2-3 days |
| **Triage Complete** | Within 14 days | Within 3-5 days |
| **Fix Development** | Varies by severity | Priority handling |
| **Patch Release** | Coordinated disclosure | Early access |

### Severity Response Targets

| Severity | Initial Response | Fix Target | Public Disclosure |
|----------|-----------------|------------|-------------------|
| **Critical** | 24 hours | 7-14 days | After patch release |
| **High** | 48 hours | 14-30 days | After patch release |
| **Medium** | 5 days | 30-60 days | After patch release |
| **Low** | 10 days | Next release | With release notes |

**Note:** These are targets, not guarantees. Complex vulnerabilities may take longer to fix properly.

---

## Our Responsible Disclosure Process

### 1. Report Received
- We acknowledge receipt of your report
- Assign a tracking number for reference
- Begin initial assessment

### 2. Validation & Triage
- Reproduce the vulnerability
- Assess severity and impact
- Determine affected versions
- Provide regular updates to reporter

### 3. Fix Development
- Develop and test a patch
- May request reporter's assistance in validation
- Prepare security advisory

### 4. Coordinated Disclosure
- Agree on disclosure date with reporter (typically 90 days from report)
- Release patch to all users
- Publish security advisory
- Credit reporter (if permission granted)

### 5. Post-Disclosure
- Monitor for exploitation attempts
- Update documentation if needed
- Implement additional preventive measures

---

## What to Expect

### We Will:
- ✅ Acknowledge your report promptly
- ✅ Keep you informed of our progress
- ✅ Work with you to understand the issue
- ✅ Credit you publicly (if you wish)
- ✅ Fix verified vulnerabilities
- ✅ Notify users appropriately

### We Won't:
- ❌ Ignore your report
- ❌ Threaten legal action against good-faith researchers
- ❌ Disclose your identity without permission
- ❌ Take credit for your findings

---

## Scope

### In Scope
The following are within the scope of our security program:

- ✅ NexoralDNS server application (DNS server, DHCP, Broker)
- ✅ Web dashboard and management interface
- ✅ API endpoints and authentication
- ✅ Access control mechanisms
- ✅ Data storage and encryption
- ✅ Docker containers and configurations
- ✅ Installation scripts

### Out of Scope
The following are **NOT** in scope:

- ❌ Vulnerabilities in third-party dependencies (report to upstream)
- ❌ Social engineering attacks
- ❌ Physical security attacks
- ❌ Denial of Service (DoS) attacks
- ❌ Issues requiring physical access to the server
- ❌ Issues that only affect outdated/unsupported versions
- ❌ Issues in user-modified installations (license violation)
- ❌ Theoretical vulnerabilities without practical exploit

### Safe Harbor
We support security research conducted in good faith. We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, and service interruption
- Only interact with accounts they own or with explicit permission
- Do not exploit vulnerabilities beyond what's necessary to demonstrate the issue
- Follow this disclosure policy
- Do not violate any laws

---

## Security Best Practices for Users

### For All Users

1. **Keep Updated**
   ```bash
   # Check for updates regularly
   curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update
   ```

2. **Change Default Credentials**
   - Change default admin password immediately after installation
   - Use strong, unique passwords

3. **Network Security**
   - **DO NOT expose to public internet** (DNS port 53, Web port 4000)
   - Use only within your LAN as intended
   - Configure firewall rules appropriately

4. **Access Control**
   - Limit access to the web dashboard
   - Use premium tier for multi-user environments
   - Regularly review user access

5. **Monitor Logs**
   - Regularly check DNS query logs for suspicious activity
   - Enable alerts for unusual patterns (premium feature)

6. **Backup Configuration**
   - Regularly backup your configuration
   - Test restore procedures
   - Store backups securely

### For Premium Users

7. **Enable Advanced Security Features**
   - Configure access control policies
   - Set up IP-based restrictions
   - Use API keys with limited permissions

8. **Audit Trail**
   - Review audit logs regularly
   - Monitor user actions
   - Set up automated alerting

---

## Security Updates

### Notification Channels

Security updates are announced through:

1. **GitHub Security Advisories** - [Watch the repository](https://github.com/nexoral/NexoralDNS)
2. **Release Notes** - Always check before updating
3. **Premium Email** - Premium customers receive direct notifications
4. **Website** - [nexoral.in/security](https://nexoral.in/security)

### Applying Security Updates

```bash
# For Docker installations
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update

# Verify update
cat VERSION
```

Always review release notes before updating to understand what's changed.

---

## Hall of Fame

We recognize and thank security researchers who have responsibly disclosed vulnerabilities:

<!-- This section will be updated as we receive reports -->

*No vulnerabilities have been publicly disclosed yet.*

Want to see your name here? Help us improve NexoralDNS security!

---

## Bug Bounty Program

**Current Status:** Not available

We do not currently offer a paid bug bounty program. However:

- We deeply appreciate all security reports
- Public recognition in our Hall of Fame (if desired)
- Premium customers may receive license extensions for critical findings
- We may offer rewards on a case-by-case basis for exceptional findings

---

## Contact

- **Security Email:** security@nexoral.in
- **General Contact:** [nexoral.in](https://nexoral.in)
- **GitHub:** [github.com/nexoral/NexoralDNS](https://github.com/nexoral/NexoralDNS)

For non-security issues, please use our [issue tracker](https://github.com/nexoral/NexoralDNS/issues) or see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Legal

This security policy does not create any rights for researchers or obligations beyond what is stated here. We reserve the right to modify this policy at any time. We will make reasonable efforts to notify the community of significant changes.

---

**Thank you for helping keep NexoralDNS and our users safe!** 🔒
