'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import InputField from '../../../components/ui/InputField';

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'backup', label: 'Backup', icon: '💾' }
  ];

  const handleSave = () => {
    alert('Settings saved successfully!');
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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Settings</h1>
            <p className="text-slate-600">Configure your NexoralDNS system settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {tabs.find(tab => tab.id === activeTab)?.label} Settings
                  </h2>
                </div>

                <div className="p-6">
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">Server Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputField
                            type="text"
                            placeholder="Server Name"
                            defaultValue="NexoralDNS Primary"
                          />
                          <InputField
                            type="text"
                            placeholder="Default TTL"
                            defaultValue="3600"
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">DNS Settings</h3>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Enable DNS caching</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Enable DNSSEC validation</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">Authentication</h3>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Enable two-factor authentication</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Require strong passwords</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">Access Control</h3>
                        <InputField
                          type="text"
                          placeholder="Allowed IP ranges (comma separated)"
                          defaultValue="192.168.1.0/24, 10.0.0.0/8"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">Email Notifications</h3>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">System alerts</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Security events</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="ml-2 text-sm text-slate-700">Weekly reports</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'backup' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium text-slate-800 mb-4">Automatic Backup</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Backup Frequency</label>
                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                              <option>Daily</option>
                              <option>Weekly</option>
                              <option>Monthly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Retention Period</label>
                            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                              <option>7 days</option>
                              <option>30 days</option>
                              <option>90 days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <Button variant="secondary">
                          Create Backup Now
                        </Button>
                        <Button variant="secondary">
                          Restore from Backup
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-6 border-t border-slate-200">
                    <Button onClick={handleSave} variant="primary">
                      Save Settings
                    </Button>
                  </div>
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
