import CopyCodeBlock from "@/components/CopyCodeBlock";
import { FadeIn } from "@/components/MotionWrapper";

export default function API() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>API Reference</h1>

          <p className="text-xl text-gray-400">
            Complete REST API documentation for programmatic control and automation of NexoralDNS.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
            <p className="text-yellow-400 font-semibold mb-2">🔒 Premium Feature</p>
            <p className="text-sm text-gray-300 mb-0">
              API access is only available for Premium tier users. <a href="/docs/features">Upgrade to Premium</a> to unlock API capabilities.
            </p>
          </div>

          <h2>Getting Started</h2>

          <h3>Base URL</h3>
          <p>
            All API requests are made to:
          </p>
          <CopyCodeBlock code="http://localhost:4000/api" />

          <h3>Authentication</h3>
          <p>
            NexoralDNS uses JWT (JSON Web Tokens) for API authentication. Include your token in the Authorization header:
          </p>
          <CopyCodeBlock code='Authorization: Bearer YOUR_JWT_TOKEN' />

          <h3>Getting Your API Token</h3>
          <ol>
            <li>Log in to the NexoralDNS dashboard</li>
            <li>Navigate to Settings → API Keys</li>
            <li>Click &quot;Generate New API Key&quot;</li>
            <li>Copy and securely store your token</li>
          </ol>

          <h2>DNS Records</h2>

          <h3>Create DNS Record</h3>
          <p>Create a new DNS record (A, AAAA, or CNAME).</p>

          <CopyCodeBlock
            code={`POST /api/dns
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "domain": "myapp.local",
  "type": "A",
  "value": "192.168.1.100",
  "ttl": 300
}`}
          />

          <h3>List DNS Records</h3>
          <p>Retrieve all DNS records for your account.</p>

          <CopyCodeBlock
            code={`GET /api/dns?userId=YOUR_USER_ID
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h3>Get Specific DNS Record</h3>
          <CopyCodeBlock
            code={`GET /api/dns/:recordId
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h3>Update DNS Record</h3>
          <CopyCodeBlock
            code={`PUT /api/dns/:recordId
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "value": "192.168.1.101",
  "ttl": 600
}`}
          />

          <h3>Delete DNS Record</h3>
          <CopyCodeBlock
            code={`DELETE /api/dns/:recordId
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h2>Rewrite Rules</h2>

          <h3>Create Rewrite Rule</h3>
          <p>Redirect one domain to another (e.g., google.com → ankan.site).</p>

          <CopyCodeBlock
            code={`POST /api/rewrites
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "sourceDomain": "google.com",
  "targetDomain": "ankan.site",
  "applyToClients": ["192.168.1.5"],  // Empty array for global
  "ttl": 300,
  "priority": 10
}`}
          />

          <h3>List Rewrites</h3>
          <CopyCodeBlock
            code={`GET /api/rewrites?userId=YOUR_USER_ID
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h3>Update Rewrite</h3>
          <CopyCodeBlock
            code={`PUT /api/rewrites/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "enabled": false
}`}
          />

          <h3>Delete Rewrite</h3>
          <CopyCodeBlock
            code={`DELETE /api/rewrites/:id
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h2>Block Rules</h2>

          <h3>Create Block Rule</h3>
          <p>Block a domain network-wide or for specific clients.</p>

          <CopyCodeBlock
            code={`POST /api/blocks
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "domain": "ads.google.com",
  "blockType": "exact",  // "exact" or "wildcard"
  "applyToClients": [],  // Empty for all clients
  "reason": "Ads"
}`}
          />

          <h3>List Blocks</h3>
          <CopyCodeBlock
            code={`GET /api/blocks?userId=YOUR_USER_ID
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h3>Delete Block</h3>
          <CopyCodeBlock
            code={`DELETE /api/blocks/:id
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h2>Analytics</h2>

          <h3>Query Logs</h3>
          <p>Retrieve DNS query logs with filtering options.</p>

          <CopyCodeBlock
            code={`GET /api/analytics/queries?startDate=2024-01-01&endDate=2024-01-31&clientIP=192.168.1.5
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h4>Response Example:</h4>
          <CopyCodeBlock
            language="json"
            code={`{
  "totalQueries": 150000,
  "cachedQueries": 120000,
  "upstreamQueries": 25000,
  "blockedQueries": 5000,
  "averageResponseTime": 2.3,
  "topDomains": [
    { "domain": "google.com", "count": 5000 },
    { "domain": "facebook.com", "count": 3000 }
  ]
}`}
          />

          <h3>Performance Stats</h3>
          <p>Get real-time performance metrics.</p>

          <CopyCodeBlock
            code={`GET /api/analytics/performance
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h4>Response Example:</h4>
          <CopyCodeBlock
            language="json"
            code={`{
  "cacheHitRate": 0.82,
  "averageQueryTime": 2.1,
  "queriesPerSecond": 150,
  "activeConnections": 45,
  "uptime": 2592000
}`}
          />

          <h2>User Plans</h2>

          <h3>Get User Plan</h3>
          <p>Retrieve your current subscription plan details.</p>

          <CopyCodeBlock
            code={`GET /api/plans/:userId
Authorization: Bearer YOUR_JWT_TOKEN`}
          />

          <h4>Response Example:</h4>
          <CopyCodeBlock
            language="json"
            code={`{
  "planType": "pro",
  "features": {
    "maxRewrites": -1,  // -1 = unlimited
    "maxBlocks": -1,
    "customDNS": true,
    "analyticsEnabled": true,
    "apiAccess": true
  },
  "status": "active",
  "expiresAt": "2025-12-31T23:59:59Z"
}`}
          />

          <h2>Rate Limits</h2>

          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Rate Limit</th>
                <th>Window</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Authentication</td>
                <td>5 requests</td>
                <td>1 minute</td>
              </tr>
              <tr>
                <td>DNS Records (Read)</td>
                <td>100 requests</td>
                <td>1 minute</td>
              </tr>
              <tr>
                <td>DNS Records (Write)</td>
                <td>20 requests</td>
                <td>1 minute</td>
              </tr>
              <tr>
                <td>Rewrites/Blocks</td>
                <td>30 requests</td>
                <td>1 minute</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>60 requests</td>
                <td>1 minute</td>
              </tr>
            </tbody>
          </table>

          <h2>Error Handling</h2>

          <p>
            All errors return a JSON response with an error code and message:
          </p>

          <CopyCodeBlock
            language="json"
            code={`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired API token"
  }
}`}
          />

          <h3>Common Error Codes</h3>

          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>UNAUTHORIZED</td>
                <td>401</td>
                <td>Invalid or missing API token</td>
              </tr>
              <tr>
                <td>FORBIDDEN</td>
                <td>403</td>
                <td>Insufficient permissions</td>
              </tr>
              <tr>
                <td>NOT_FOUND</td>
                <td>404</td>
                <td>Resource not found</td>
              </tr>
              <tr>
                <td>VALIDATION_ERROR</td>
                <td>400</td>
                <td>Invalid request parameters</td>
              </tr>
              <tr>
                <td>RATE_LIMIT</td>
                <td>429</td>
                <td>Rate limit exceeded</td>
              </tr>
              <tr>
                <td>SERVER_ERROR</td>
                <td>500</td>
                <td>Internal server error</td>
              </tr>
            </tbody>
          </table>

          <h2>Example: Python Client</h2>

          <CopyCodeBlock
            language="python"
            code={`import requests

class NexoralDNSClient:
    def __init__(self, api_token, base_url="http://localhost:4000/api"):
        self.api_token = api_token
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def create_dns_record(self, domain, record_type, value, ttl=300):
        """Create a new DNS record"""
        url = f"{self.base_url}/dns"
        data = {
            "domain": domain,
            "type": record_type,
            "value": value,
            "ttl": ttl
        }
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()

    def list_dns_records(self, user_id):
        """List all DNS records"""
        url = f"{self.base_url}/dns?userId={user_id}"
        response = requests.get(url, headers=self.headers)
        return response.json()

    def create_block_rule(self, domain, block_type="exact", clients=None):
        """Create a domain block rule"""
        url = f"{self.base_url}/blocks"
        data = {
            "domain": domain,
            "blockType": block_type,
            "applyToClients": clients or [],
            "reason": "Custom"
        }
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()

# Usage
client = NexoralDNSClient("your_api_token_here")

# Create DNS record
result = client.create_dns_record("myapp.local", "A", "192.168.1.100")
print(result)

# Block a domain
result = client.create_block_rule("ads.example.com")
print(result)`}
          />

          <h2>Example: Node.js Client</h2>

          <CopyCodeBlock
            language="javascript"
            code={`const axios = require('axios');

class NexoralDNSClient {
  constructor(apiToken, baseUrl = 'http://localhost:4000/api') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json'
    };
  }

  async createDnsRecord(domain, type, value, ttl = 300) {
    const url = \`\${this.baseUrl}/dns\`;
    const data = { domain, type, value, ttl };
    const response = await axios.post(url, data, { headers: this.headers });
    return response.data;
  }

  async listDnsRecords(userId) {
    const url = \`\${this.baseUrl}/dns?userId=\${userId}\`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data;
  }

  async createBlockRule(domain, blockType = 'exact', clients = []) {
    const url = \`\${this.baseUrl}/blocks\`;
    const data = { domain, blockType, applyToClients: clients, reason: 'Custom' };
    const response = await axios.post(url, data, { headers: this.headers });
    return response.data;
  }
}

// Usage
const client = new NexoralDNSClient('your_api_token_here');

(async () => {
  // Create DNS record
  const record = await client.createDnsRecord('myapp.local', 'A', '192.168.1.100');
  console.log(record);

  // Block a domain
  const block = await client.createBlockRule('ads.example.com');
  console.log(block);
})();`}
          />

          <h2>Webhooks (Coming Soon)</h2>

          <p>
            Webhook support is planned for future releases. This will allow you to receive real-time
            notifications for events such as:
          </p>

          <ul>
            <li>New DNS queries</li>
            <li>Blocked domain attempts</li>
            <li>Configuration changes</li>
            <li>Service status changes</li>
          </ul>

          <h2>Support</h2>

          <p>
            For API-related questions or issues:
          </p>

          <ul>
            <li>Premium users: Contact priority support via email</li>
            <li>General questions: Open an issue on <a href="https://github.com/nexoral/NexoralDNS/issues">GitHub</a></li>
            <li>Documentation updates: See <a href="/docs/contributing">Contributing Guide</a></li>
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}
