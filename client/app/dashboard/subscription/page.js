'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import InputField from '../../../components/ui/InputField';

export default function SubscriptionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });
  const [accessKey, setAccessKey] = useState('NK-PRO-2024-ABCD1234');
  const [isValidating, setIsValidating] = useState(false);

  const subscription = {
    plan: 'Pro',
    status: 'Active',
    validUntil: '2024-12-31',
    features: [
      'Unlimited DNS queries',
      'Advanced analytics',
      'Custom domains',
      'API access',
      'Priority support',
      'Advanced security features'
    ],
    usage: {
      queries: { current: 152847, limit: 'Unlimited' },
      domains: { current: 24, limit: 100 },
      users: { current: 12, limit: 25 },
      storage: { current: '2.4 GB', limit: '10 GB' }
    }
  };

  const handleValidateKey = async () => {
    setIsValidating(true);
    // Simulate API call
    setTimeout(() => {
      setIsValidating(false);
      alert('Access key validated successfully!');
    }, 2000);
  };

  const handleUpgrade = () => {
    alert('Redirecting to upgrade page...');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Subscription</h1>
            <p className="text-slate-600">Manage your NexoralDNS subscription and access keys</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Current Plan</h2>
                    <p className="text-slate-600">Your active subscription details</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{subscription.plan}</div>
                    <div className={`text-sm px-2 py-1 rounded-full inline-block ${subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {subscription.status}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-600">Valid Until</p>
                    <p className="text-lg font-semibold text-slate-800">{subscription.validUntil}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-600">Renewal</p>
                    <p className="text-lg font-semibold text-slate-800">Auto-renewal</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-slate-800 mb-3">Plan Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subscription.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button onClick={handleUpgrade} variant="primary">
                    Upgrade Plan
                  </Button>
                  <Button variant="secondary">
                    Billing History
                  </Button>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Usage Statistics</h2>
                <div className="space-y-4">
                  {Object.entries(subscription.usage).map(([key, usage]) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700 capitalize">{key}</span>
                        <span className="text-sm text-slate-600">
                          {usage.current} / {usage.limit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                          style={{
                            width: usage.limit === 'Unlimited' ? '60%' :
                              `${Math.min((parseInt(usage.current) / parseInt(usage.limit)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Access Key Management */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Access Key</h2>
                <p className="text-sm text-slate-600 mb-4">
                  Your SaaS access key for API authentication
                </p>

                <InputField
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Enter access key"
                />

                <Button
                  onClick={handleValidateKey}
                  isLoading={isValidating}
                  variant="primary"
                  fullWidth
                  className="mt-4"
                >
                  {isValidating ? 'Validating...' : 'Validate Key'}
                </Button>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-800">Key is valid</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Button variant="secondary" size="sm" fullWidth>
                    Download Invoice
                  </Button>
                  <Button variant="secondary" size="sm" fullWidth>
                    API Documentation
                  </Button>
                  <Button variant="secondary" size="sm" fullWidth>
                    Contact Support
                  </Button>
                  <Button variant="secondary" size="sm" fullWidth>
                    Manage Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
