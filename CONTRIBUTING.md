# Contributing to NexoralDNS

Thank you for your interest in NexoralDNS! We appreciate your support and feedback.

## ⚠️ Important Notice

**NexoralDNS is source-available proprietary software, not open source.**

This means:
- ✅ You can view the source code
- ✅ You can report bugs and issues
- ✅ You can suggest features
- ✅ You can help improve documentation
- ❌ Code contributions (pull requests) are **NOT** accepted
- ❌ Modifications to the source code are **NOT** permitted

See our [LICENSE](LICENSE) file for complete terms.

---

## How You Can Contribute

Even though we don't accept code contributions, there are many valuable ways you can help improve NexoralDNS:

### 1. 🐛 Report Bugs

Found a bug? We want to know! Please help us by:

1. **Check existing issues** first to avoid duplicates
2. **Create a new issue** with the "Bug Report" template
3. **Provide detailed information:**
   - NexoralDNS version (found in dashboard or `VERSION` file)
   - Operating system and version
   - Steps to reproduce the bug
   - Expected behavior vs actual behavior
   - Error messages or logs (if any)
   - Screenshots (if applicable)

**Example of a good bug report:**
```
Title: DNS queries fail for custom domains after restart

Environment:
- NexoralDNS version: 1.2.3
- OS: Ubuntu 22.04 LTS
- Docker version: 24.0.5

Steps to reproduce:
1. Create custom domain "app.local" pointing to 192.168.1.100
2. Restart NexoralDNS using `docker compose restart`
3. Query the domain using `dig app.local`

Expected: Should resolve to 192.168.1.100
Actual: Returns NXDOMAIN error

Error logs:
[paste relevant logs here]
```

### 2. 💡 Suggest Features

Have an idea to make NexoralDNS better? We'd love to hear it!

1. **Check existing feature requests** to see if it's already suggested
2. **Create a new issue** with the "Feature Request" template
3. **Describe your use case:**
   - What problem does this solve?
   - Who would benefit from this feature?
   - How should it work?
   - Any alternative solutions you've considered?

**We prioritize features based on:**
- Number of users requesting it
- Alignment with product vision
- Technical feasibility
- Premium vs free tier strategy

### 3. 📝 Improve Documentation

Found a typo, unclear instructions, or missing documentation?

1. **Create an issue** describing what's wrong or missing
2. **Suggest improvements** for documentation sections
3. **Report broken links** or outdated information

We review all documentation feedback and update accordingly.

### 4. 🔒 Report Security Vulnerabilities

**DO NOT report security vulnerabilities as public issues!**

Please see our [SECURITY.md](SECURITY.md) file for responsible disclosure procedures.

### 5. 💬 Help Other Users

- Answer questions in GitHub issues
- Share your experience and solutions
- Help troubleshoot problems others are facing
- Provide helpful information in discussions

### 6. 📣 Spread the Word

- Star the repository on GitHub
- Share NexoralDNS with others who might find it useful
- Write blog posts or tutorials about your use case
- Provide feedback on your experience

---

## Issue Guidelines

### Before Creating an Issue

- [ ] Search existing issues to avoid duplicates
- [ ] Ensure you're using the latest version
- [ ] Check the troubleshooting section in README.md
- [ ] Gather relevant information (version, OS, logs, etc.)

### Issue Etiquette

- **Be respectful** and professional in all interactions
- **Provide context** - help us understand your situation
- **Be patient** - we review all issues but may take time to respond
- **Follow up** - respond to questions and provide updates
- **Close resolved issues** - let us know when your problem is fixed

### Issue Labels

We use the following labels to organize issues:

- `bug` - Something isn't working correctly
- `feature-request` - New feature or enhancement suggestion
- `documentation` - Documentation improvements
- `question` - General questions about usage
- `duplicate` - Issue already reported
- `wontfix` - Not planned for implementation
- `investigating` - Under review by maintainers
- `priority` - High-priority issues

---

## What Happens After You Report?

### Bug Reports
1. We'll review and attempt to reproduce
2. May ask for additional information
3. Will update the issue with findings
4. Fix will be included in a future release
5. Issue will be closed when fix is deployed

### Feature Requests
1. We'll evaluate the request
2. May ask clarifying questions
3. Will label as `feature-request`
4. May be marked for future releases or declined
5. Premium features go to [nexoral.in](https://nexoral.in) customers first

---

## Why No Code Contributions?

We understand this may be different from traditional open source projects. Here's why:

1. **Commercial Product:** NexoralDNS is a commercial product with free and premium tiers
2. **Code Quality Control:** Ensures consistent code quality and architecture
3. **Support Obligations:** We're responsible for supporting all features
4. **Intellectual Property:** Protects our proprietary technology and business model
5. **Rapid Development:** Allows us to move quickly without PR review overhead

However, **your feedback is invaluable!** Many features and improvements come directly from user suggestions and bug reports.

---

## Paid Support & Custom Development

Need custom features or priority support?

- **Premium License:** Includes priority support - [nexoral.in](https://nexoral.in)
- **Enterprise Support:** Custom SLAs and dedicated support available
- **Custom Development:** Contact us for bespoke features and integrations

Visit [nexoral.in](https://nexoral.in) or email us for more information.

---

## Recognition

While we don't accept code contributions, we value all contributions:

- **Bug reporters** who help us improve stability
- **Feature requesters** who shape our roadmap
- **Community helpers** who assist other users
- **Documentation improvers** who make NexoralDNS easier to use

Thank you for being part of the NexoralDNS community! 🎉

---

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

---

## Questions?

- 📖 Check the [README.md](README.md) for basic information
- 🆘 See [Troubleshooting](README.md#-troubleshooting) in the README
- 💬 Open a GitHub issue for questions
- 🌐 Visit [nexoral.in](https://nexoral.in) for commercial inquiries

---

**Thank you for helping make NexoralDNS better!** ❤️
