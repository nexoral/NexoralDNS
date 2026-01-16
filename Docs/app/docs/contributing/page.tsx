import { FadeIn } from "@/components/MotionWrapper";

export default function Contributing() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>Contributing to NexoralDNS</h1>

          <p className="text-xl text-gray-400">
            Thank you for your interest in NexoralDNS! We appreciate your support and feedback.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-6 my-8">
            <h3 className="text-yellow-400 font-semibold mb-3">⚠️ Important Notice</h3>
            <p className="text-gray-300 mb-2">
              <strong>NexoralDNS is source-available proprietary software, not open source.</strong>
            </p>
            <p className="text-sm text-gray-400 mb-0">
              This means:
            </p>
            <ul className="text-sm text-gray-400 space-y-1 mb-0 mt-2">
              <li>✅ You can view the source code</li>
              <li>✅ You can report bugs and issues</li>
              <li>✅ You can suggest features</li>
              <li>✅ You can help improve documentation</li>
              <li>❌ Code contributions (pull requests) are <strong>NOT</strong> accepted</li>
              <li>❌ Modifications to the source code are <strong>NOT</strong> permitted</li>
            </ul>
          </div>

          <h2>How You Can Contribute</h2>

          <p>
            Even though we don&apos;t accept code contributions, there are many valuable ways you can help improve NexoralDNS:
          </p>

          <h3>1. Report Bugs</h3>

          <p>Found a bug? We want to know! Please help us by:</p>

          <ol>
            <li><strong>Check existing issues</strong> first to avoid duplicates</li>
            <li><strong>Create a new issue</strong> with the &quot;Bug Report&quot; template</li>
            <li><strong>Provide detailed information:</strong>
              <ul>
                <li>NexoralDNS version (found in dashboard or <code>VERSION</code> file)</li>
                <li>Operating system and version</li>
                <li>Steps to reproduce the bug</li>
                <li>Expected behavior vs actual behavior</li>
                <li>Error messages or logs (if any)</li>
                <li>Screenshots (if applicable)</li>
              </ul>
            </li>
          </ol>

          <h4>Example of a Good Bug Report:</h4>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 my-4">
            <pre className="text-sm text-gray-300">
              {`Title: DNS queries fail for custom domains after restart

Environment:
- NexoralDNS version: 1.2.3
- OS: Ubuntu 22.04 LTS
- Docker version: 24.0.5

Steps to reproduce:
1. Create custom domain "app.local" pointing to 192.168.1.100
2. Restart NexoralDNS using \`docker compose restart\`
3. Query the domain using \`dig app.local\`

Expected: Should resolve to 192.168.1.100
Actual: Returns NXDOMAIN error

Error logs:
[paste relevant logs here]`}
            </pre>
          </div>

          <h3>2. Suggest Features</h3>

          <p>Have an idea to make NexoralDNS better? We&apos;d love to hear it!</p>

          <ol>
            <li><strong>Check existing feature requests</strong> to see if it&apos;s already suggested</li>
            <li><strong>Create a new issue</strong> with the &quot;Feature Request&quot; template</li>
            <li><strong>Describe your use case:</strong>
              <ul>
                <li>What problem does this solve?</li>
                <li>Who would benefit from this feature?</li>
                <li>How should it work?</li>
                <li>Any alternative solutions you&apos;ve considered?</li>
              </ul>
            </li>
          </ol>

          <p>
            <strong>We prioritize features based on:</strong>
          </p>
          <ul>
            <li>Number of users requesting it</li>
            <li>Alignment with product vision</li>
            <li>Technical feasibility</li>
            <li>Premium vs free tier strategy</li>
          </ul>

          <h3>3. Improve Documentation</h3>

          <p>Found a typo, unclear instructions, or missing documentation?</p>

          <ol>
            <li><strong>Create an issue</strong> describing what&apos;s wrong or missing</li>
            <li><strong>Suggest improvements</strong> for documentation sections</li>
            <li><strong>Report broken links</strong> or outdated information</li>
          </ol>

          <p>We review all documentation feedback and update accordingly.</p>

          <h3>4. Report Security Vulnerabilities</h3>

          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
            <p className="text-red-400 font-semibold mb-2">DO NOT report security vulnerabilities as public issues!</p>
            <p className="text-sm text-gray-300 mb-0">
              Please see our <a href="/docs/security">Security Policy</a> for responsible disclosure procedures.
            </p>
          </div>

          <h3>5. Help Other Users</h3>

          <ul>
            <li>Answer questions in GitHub issues</li>
            <li>Share your experience and solutions</li>
            <li>Help troubleshoot problems others are facing</li>
            <li>Provide helpful information in discussions</li>
          </ul>

          <h3>6. Spread the Word</h3>

          <ul>
            <li>Star the repository on GitHub</li>
            <li>Share NexoralDNS with others who might find it useful</li>
            <li>Write blog posts or tutorials about your use case</li>
            <li>Provide feedback on your experience</li>
          </ul>

          <h2>Issue Guidelines</h2>

          <h3>Before Creating an Issue</h3>

          <ul>
            <li>Search existing issues to avoid duplicates</li>
            <li>Ensure you&apos;re using the latest version</li>
            <li>Check the <a href="/docs/troubleshooting">troubleshooting section</a></li>
            <li>Gather relevant information (version, OS, logs, etc.)</li>
          </ul>

          <h3>Issue Etiquette</h3>

          <ul>
            <li><strong>Be respectful</strong> and professional in all interactions</li>
            <li><strong>Provide context</strong> - help us understand your situation</li>
            <li><strong>Be patient</strong> - we review all issues but may take time to respond</li>
            <li><strong>Follow up</strong> - respond to questions and provide updates</li>
            <li><strong>Close resolved issues</strong> - let us know when your problem is fixed</li>
          </ul>

          <h3>Issue Labels</h3>

          <p>We use the following labels to organize issues:</p>

          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>bug</code></td>
                <td>Something isn&apos;t working correctly</td>
              </tr>
              <tr>
                <td><code>feature-request</code></td>
                <td>New feature or enhancement suggestion</td>
              </tr>
              <tr>
                <td><code>documentation</code></td>
                <td>Documentation improvements</td>
              </tr>
              <tr>
                <td><code>question</code></td>
                <td>General questions about usage</td>
              </tr>
              <tr>
                <td><code>duplicate</code></td>
                <td>Issue already reported</td>
              </tr>
              <tr>
                <td><code>wontfix</code></td>
                <td>Not planned for implementation</td>
              </tr>
              <tr>
                <td><code>investigating</code></td>
                <td>Under review by maintainers</td>
              </tr>
              <tr>
                <td><code>priority</code></td>
                <td>High-priority issues</td>
              </tr>
            </tbody>
          </table>

          <h2>What Happens After You Report?</h2>

          <h3>Bug Reports</h3>
          <ol>
            <li>We&apos;ll review and attempt to reproduce</li>
            <li>May ask for additional information</li>
            <li>Will update the issue with findings</li>
            <li>Fix will be included in a future release</li>
            <li>Issue will be closed when fix is deployed</li>
          </ol>

          <h3>Feature Requests</h3>
          <ol>
            <li>We&apos;ll evaluate the request</li>
            <li>May ask clarifying questions</li>
            <li>Will label as <code>feature-request</code></li>
            <li>May be marked for future releases or declined</li>
            <li>Premium features go to premium customers first</li>
          </ol>

          <h2>Why No Code Contributions?</h2>

          <p>We understand this may be different from traditional open source projects. Here&apos;s why:</p>

          <ol>
            <li><strong>Commercial Product:</strong> NexoralDNS is a commercial product with free and premium tiers</li>
            <li><strong>Code Quality Control:</strong> Ensures consistent code quality and architecture</li>
            <li><strong>Support Obligations:</strong> We&apos;re responsible for supporting all features</li>
            <li><strong>Intellectual Property:</strong> Protects our proprietary technology and business model</li>
            <li><strong>Rapid Development:</strong> Allows us to move quickly without PR review overhead</li>
          </ol>

          <p>
            However, <strong>your feedback is invaluable!</strong> Many features and improvements come directly
            from user suggestions and bug reports.
          </p>

          <h2>Paid Support & Custom Development</h2>

          <p>Need custom features or priority support?</p>

          <ul>
            <li><strong>Premium License:</strong> Includes priority support - <a href="https://nexoral.in">nexoral.in</a></li>
            <li><strong>Enterprise Support:</strong> Custom SLAs and dedicated support available</li>
            <li><strong>Custom Development:</strong> Contact us for bespoke features and integrations</li>
          </ul>

          <p>
            Visit <a href="https://nexoral.in">nexoral.in</a> or email us for more information.
          </p>

          <h2>Recognition</h2>

          <p>While we don&apos;t accept code contributions, we value all contributions:</p>

          <ul>
            <li><strong>Bug reporters</strong> who help us improve stability</li>
            <li><strong>Feature requesters</strong> who shape our roadmap</li>
            <li><strong>Community helpers</strong> who assist other users</li>
            <li><strong>Documentation improvers</strong> who make NexoralDNS easier to use</li>
          </ul>

          <p className="text-center text-xl font-semibold mt-8">
            Thank you for being part of the NexoralDNS community!
          </p>

          <h2>Questions?</h2>

          <ul>
            <li>📖 Check the <a href="/">README</a> for basic information</li>
            <li>🆘 See <a href="/docs/troubleshooting">Troubleshooting</a> guide</li>
            <li>💬 Open a GitHub issue for questions</li>
            <li>🌐 Visit <a href="https://nexoral.in">nexoral.in</a> for commercial inquiries</li>
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}
