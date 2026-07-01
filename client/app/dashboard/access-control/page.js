'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import useAuthStore from '../../../stores/authStore';
import PoliciesTab from '../../../components/access-control/PoliciesTab';
import DomainGroupsTab from '../../../components/access-control/DomainGroupsTab';
import IPGroupsTab from '../../../components/access-control/IPGroupsTab';

export default function AccessControlPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('policies');
  const { user } = useAuthStore();

  const tabs = [
    { id: 'policies', label: 'Policies', icon: '🛡️' },
    { id: 'domain-groups', label: 'Domain Groups', icon: '📁' },
    { id: 'ip-groups', label: 'IP Groups', icon: '👥' }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
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
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-1)] mb-2">Access Control</h1>
            <p className="text-[var(--text-3)]">Manage blocking policies, domain groups, and access restrictions</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] overflow-hidden">
            <div className="border-b border-[var(--border)]">
              <nav className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      px-6 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'border-b-2 border-blue-500 text-[var(--blue)] bg-[rgba(91,140,255,0.07)]'
                        : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg)]'
                      }
                    `}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'policies' && <PoliciesTab />}
              {activeTab === 'domain-groups' && <DomainGroupsTab />}
              {activeTab === 'ip-groups' && <IPGroupsTab />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
