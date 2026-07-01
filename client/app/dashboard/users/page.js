'use client';

import { useState, useMemo } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import useAuthStore from '../../../stores/authStore';
import UsersTab from '../../../components/users/UsersTab';
import RolesTab from '../../../components/users/RolesTab';

// Mirrors the server's PermissionGuard.canAccess(...) gates on /api/users and /api/roles
const USERS_TAB_PERMISSIONS = [4, 5];
const ROLES_TAB_PERMISSIONS = [4, 6];

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, hasAnyPermission } = useAuthStore();

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'users', label: 'Users', icon: '👤', requiredPermissions: USERS_TAB_PERMISSIONS },
      { id: 'roles', label: 'Roles', icon: '🛡️', requiredPermissions: ROLES_TAB_PERMISSIONS }
    ];
    return allTabs.filter(tab => hasAnyPermission(tab.requiredPermissions));
  }, [hasAnyPermission]);

  const [activeTab, setActiveTab] = useState(null);
  const currentTab = activeTab && tabs.some(t => t.id === activeTab) ? activeTab : tabs[0]?.id;

  return (
    <div className="min-h-screen bg-[#07090e]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#e7eef6] mb-2">Users & Roles</h1>
            <p className="text-[#9aa8bd]">Manage user accounts and role-based access control</p>
          </div>

          <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] overflow-hidden">
            {tabs.length > 1 && (
              <div className="border-b border-[rgba(130,165,220,0.1)]">
                <nav className="flex overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        px-6 py-4 text-sm font-medium transition-all whitespace-nowrap flex items-center space-x-2
                        ${currentTab === tab.id
                          ? 'border-b-2 border-blue-500 text-[#5b8cff] bg-[rgba(91,140,255,0.07)]'
                          : 'text-[#9aa8bd] hover:text-[#e7eef6] hover:bg-[#07090e]'
                        }
                      `}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            )}

            <div className="p-6">
              {currentTab === 'users' && <UsersTab />}
              {currentTab === 'roles' && <RolesTab />}
              {!currentTab && (
                <p className="text-sm text-[#9aa8bd]">You don't have permission to manage users or roles.</p>
              )}
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
