'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });
  const [dnsServiceStatus, setDnsServiceStatus] = useState('running');
  const [isLoading, setIsLoading] = useState(false);

  // DNS Server Configuration
  const [serverConfig] = useState({
    serverIP: '192.168.1.9',
    dnsPort: 53,
    uptime: '7 days, 14 hours',
    version: '1.0.0',
    lastRestart: '2024-01-15 10:30:00'
  });

  const handleServiceAction = async (action) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (action === 'stop') {
        setDnsServiceStatus('stopped');
        alert('DNS service stopped successfully');
      } else if (action === 'start') {
        setDnsServiceStatus('running');
        alert('DNS service started successfully');
      } else if (action === 'restart') {
        setDnsServiceStatus('restarting');
        setTimeout(() => {
          setDnsServiceStatus('running');
          alert('DNS service restarted successfully');
        }, 3000);
      }
    } catch (error) {
      alert('Service action failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped': return 'bg-red-100 text-red-800 border-red-200';
      case 'restarting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
      case 'stopped':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'restarting':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-spin"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
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
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">DNS Server Settings</h1>
            <p className="text-slate-600">Manage your DNS server configuration and services</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Information */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                Server Information
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Server IP Address</span>
                  <span className="text-sm text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">
                    {serverConfig.serverIP}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">DNS Port</span>
                  <span className="text-sm text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">
                    {serverConfig.dnsPort}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Server Version</span>
                  <span className="text-sm text-slate-900">{serverConfig.version}</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Uptime</span>
                  <span className="text-sm text-slate-900">{serverConfig.uptime}</span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-medium text-slate-600">Last Restart</span>
                  <span className="text-sm text-slate-900">{serverConfig.lastRestart}</span>
                </div>
              </div>
            </div>

            {/* Service Control */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                DNS Service Control
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-slate-800">DNS Service Status</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(dnsServiceStatus)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(dnsServiceStatus)}`}>
                        {dnsServiceStatus.charAt(0).toUpperCase() + dnsServiceStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4">
                    Control the DNS service status. Use the buttons below to start, stop, or restart the DNS service.
                  </p>

                  {/* Service Control Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {dnsServiceStatus === 'running' && (
                      <>
                        <Button
                          onClick={() => handleServiceAction('stop')}
                          isLoading={isLoading}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                        >
                          {isLoading ? 'Stopping...' : '⏹️ Stop Service'}
                        </Button>
                        <Button
                          onClick={() => handleServiceAction('restart')}
                          variant="secondary"
                          isLoading={isLoading}
                          disabled={isLoading}
                          className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                        >
                          {isLoading ? 'Restarting...' : '🔄 Restart Service'}
                        </Button>
                      </>
                    )}

                    {dnsServiceStatus === 'stopped' && (
                      <Button
                        onClick={() => handleServiceAction('start')}
                        isLoading={isLoading}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                      >
                        {isLoading ? 'Starting...' : '▶️ Start Service'}
                      </Button>
                    )}

                    {dnsServiceStatus === 'restarting' && (
                      <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm font-medium">Service is restarting...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Status Messages */}
                {dnsServiceStatus === 'stopped' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">🛑 DNS Service Stopped</p>
                        <p className="text-sm text-red-700 mt-1">
                          The DNS service is currently stopped. All DNS resolution requests will fail until the service is started.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {dnsServiceStatus === 'running' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-green-800">✅ DNS Service Running</p>
                        <p className="text-sm text-green-700 mt-1">
                          The DNS service is running normally and processing DNS resolution requests.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning for service actions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">⚠️ Service Control Warning</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Stopping or restarting the DNS service will temporarily interrupt DNS resolution for all connected clients. Make sure to inform users before performing these actions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
              </svg>
              Network Configuration Instructions
            </h2>

            <div className="space-y-6">
              {/* Critical IP Reservation Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">🚨 CRITICAL: Set Static IP for this server!</p>
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Reserve/Static IP: {serverConfig.serverIP}</strong> in your router settings to prevent DNS service interruption.
                      This prevents IP changes that would break DNS resolution for all clients.
                    </p>
                  </div>
                </div>
              </div>

              {/* Router Configuration Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  📋 Complete Router Configuration Guide
                </h3>

                <div className="space-y-4">
                  <div className="bg-white rounded p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Step 1: Access Router Admin Panel</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-2">
                      <li>Open your web browser</li>
                      <li>Navigate to your router's IP (usually 192.168.1.1 or 192.168.0.1)</li>
                      <li>Login with your router admin credentials</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Step 2: Configure DHCP & DNS Settings</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-2">
                      <li>Navigate to <strong>DHCP Settings</strong> or <strong>LAN Settings</strong></li>
                      <li>Find the <strong>DNS Server Settings</strong> section</li>
                      <li><strong>Set Primary DNS Server to: {serverConfig.serverIP}</strong></li>
                      <li><strong>IMPORTANT:</strong> Remove or leave Secondary DNS empty (do not use 8.8.8.8 or other DNS servers)</li>
                      <li>This ensures ALL DNS queries go through NexoralDNS only</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Step 3: Reserve IP Address (Critical)</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-2">
                      <li>Navigate to <strong>DHCP Reservation</strong> or <strong>Static IP</strong> settings</li>
                      <li>Find this server's MAC address in connected devices</li>
                      <li><strong>Reserve IP: {serverConfig.serverIP}</strong> for this server</li>
                      <li>This prevents the server IP from changing and breaking DNS</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded p-4 border border-blue-100">
                    <h4 className="font-semibold text-blue-800 mb-2">Step 4: Apply & Restart</h4>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside ml-2">
                      <li><strong>Save all settings</strong> in your router</li>
                      <li><strong>Restart your router</strong> to apply changes</li>
                      <li>Wait 2-3 minutes for router to fully boot up</li>
                      <li>All devices will now use NexoralDNS automatically</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Current Server Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-3">🌐 Your NexoralDNS Server Configuration</h3>
                <div className="bg-white rounded p-3 border border-green-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>DNS Server IP:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded">{serverConfig.serverIP}</span></p>
                      <p><strong>DNS Port:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded">{serverConfig.dnsPort}</span></p>
                    </div>
                    <div>
                      <p><strong>Web Interface:</strong> <span className="font-mono bg-green-100 px-2 py-1 rounded">http://localhost:4000</span></p>
                      <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Active & Running</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Steps */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-3">🔍 Verify Configuration is Working</h3>
                <div className="space-y-2 text-sm text-yellow-700">
                  <p><strong>1. Check DNS Resolution:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Open Command Prompt/Terminal on any device</li>
                    <li>Run: <code className="bg-yellow-100 px-1 rounded">nslookup google.com</code></li>
                    <li>Server should show: <strong>{serverConfig.serverIP}</strong></li>
                  </ul>

                  <p className="mt-3"><strong>2. Test Custom Domains:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Add a custom domain in NexoralDNS</li>
                    <li>Try accessing it from any device on your network</li>
                    <li>It should resolve to your specified IP address</li>
                  </ul>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">🛠️ Troubleshooting Tips</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>If DNS is not working:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Ensure NexoralDNS service is running (check above)</li>
                    <li>Verify router DNS is set to <strong>{serverConfig.serverIP}</strong> only</li>
                    <li>Check IP reservation is active for this server</li>
                    <li>Restart router and wait 2-3 minutes</li>
                    <li>On devices, run: <code className="bg-gray-100 px-1 rounded">ipconfig /flushdns</code> (Windows) or restart device</li>
                  </ul>
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
