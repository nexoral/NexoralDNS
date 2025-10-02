'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import RuleCard from '../../../components/rules/RuleCard';
import RuleModal from '../../../components/rules/RuleModal';
import Button from '../../../components/ui/Button';

export default function DNSRulesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('blocklist');
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  // Dummy data for rules
  const [rules, setRules] = useState({
    blocklist: [
      { id: 1, domain: 'ads.example.com', type: 'blocklist', status: 'active', created: '2024-01-15' },
      { id: 2, domain: 'tracker.malware.com', type: 'blocklist', status: 'active', created: '2024-01-14' },
      { id: 3, domain: 'spam.evil.com', type: 'blocklist', status: 'inactive', created: '2024-01-13' }
    ],
    reroute: [
      { id: 4, domain: 'old-site.com', target: 'new-site.com', type: 'reroute', status: 'active', created: '2024-01-12' },
      { id: 5, domain: 'legacy.app.com', target: 'app.newdomain.com', type: 'reroute', status: 'active', created: '2024-01-11' }
    ],
    ttl: [
      { id: 6, domain: 'cache.example.com', ttl: 3600, type: 'ttl', status: 'active', created: '2024-01-10' },
      { id: 7, domain: 'api.service.com', ttl: 300, type: 'ttl', status: 'active', created: '2024-01-09' }
    ],
    custom: [
      { id: 8, domain: 'custom.internal.com', ip: '192.168.1.100', type: 'custom', status: 'active', created: '2024-01-08' },
      { id: 9, domain: 'dev.test.local', ip: '10.0.0.50', type: 'custom', status: 'active', created: '2024-01-07' }
    ]
  });

  const tabs = [
    { id: 'blocklist', label: 'Blocklist', icon: '🚫', count: rules.blocklist.length },
    { id: 'reroute', label: 'Reroute', icon: '↗️', count: rules.reroute.length },
    { id: 'ttl', label: 'TTL Control', icon: '⏱️', count: rules.ttl.length },
    { id: 'custom', label: 'Custom Domains', icon: '🏠', count: rules.custom.length }
  ];

  const handleAddRule = (newRule) => {
    const ruleWithId = { ...newRule, id: Date.now(), created: new Date().toISOString().split('T')[0] };
    setRules(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], ruleWithId]
    }));
  };

  const handleDeleteRule = (id) => {
    setRules(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(rule => rule.id !== id)
    }));
  };

  const handleToggleRule = (id) => {
    setRules(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(rule =>
        rule.id === id ? { ...rule, status: rule.status === 'active' ? 'inactive' : 'active' } : rule
      )
    }));
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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">DNS Rule Management</h1>
            <p className="text-slate-600">Manage blocklists, rerouting, TTL settings, and custom domains</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="border-b border-slate-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-800">
                  {tabs.find(tab => tab.id === activeTab)?.label} Rules
                </h2>
                <Button
                  onClick={() => setShowModal(true)}
                  variant="primary"
                >
                  Add Rule
                </Button>
              </div>

              {/* Rules List */}
              <div className="grid gap-4">
                {rules[activeTab].map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={() => handleToggleRule(rule.id)}
                    onDelete={() => handleDeleteRule(rule.id)}
                  />
                ))}
              </div>

              {rules[activeTab].length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No rules configured</h3>
                  <p className="text-slate-600 mb-4">Create your first {activeTab} rule to get started</p>
                  <Button onClick={() => setShowModal(true)}>
                    Add First Rule
                  </Button>
                </div>
              )}
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

      {/* Add Rule Modal */}
      {showModal && (
        <RuleModal
          type={activeTab}
          onClose={() => setShowModal(false)}
          onSave={handleAddRule}
        />
      )}
    </div>
  );
}
