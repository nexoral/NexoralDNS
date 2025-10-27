'use client';

import { useState } from 'react';
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatsCards from '../../components/dashboard/StatsCards';
import QuickActions from '../../components/dashboard/QuickActions';
import NetworkOverview from '../../components/dashboard/NetworkOverview';
import useAuthStore from '../../stores/authStore';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  // Simplified dummy data for essential features only
  const [stats, setStats] = useState({
    totalQueries: 152847,
    queriesChange: '+12.5%',
    managedDomains: 24,
    domainsChange: '+3',
    systemHealth: '99.5%',
    healthChange: '+0.1%'
  });

  const quickActions = [
    {
      title: 'Domain Management',
      description: 'Add and configure domains & DNS records',
      icon: '🌐',
      link: '/dashboard/domains',
      count: stats.managedDomains
    },
    {
      title: 'Server Settings',
      description: 'Configure DNS server settings',
      icon: '⚙️',
      link: '/dashboard/settings',
      count: 'Configure'
    },
    {
      title: 'Connected Devices',
      description: 'View and manage connected network devices',
      icon: '📱',
      link: '/dashboard/devices',
      count: 'View'
    }
    // Removed "Active Domains" card as requested
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Dashboard Content */}
        <main className="p-4 lg:p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
              Welcome back, {user?.username ? user.username : 'User'}! 👋
            </h1>
            <p className="text-slate-600">Manage your DNS infrastructure efficiently.</p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Network Overview - New Component */}
          <div className="mb-8">
            <NetworkOverview />
          </div>

          {/* Quick Actions */}
          <QuickActions actions={quickActions} />

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