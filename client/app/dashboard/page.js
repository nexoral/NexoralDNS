'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatsCards from '../../components/dashboard/StatsCards';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentActivity from '../../components/dashboard/RecentActivity';
import SystemOverview from '../../components/dashboard/SystemOverview';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  // Dummy data aggregating all features
  const [stats, setStats] = useState({
    totalQueries: 152847,
    queriesChange: '+12.5%',
    activeRules: 24,
    rulesChange: '+3',
    managedDomains: 156,
    domainsChange: '+8',
    activeUsers: 12,
    usersChange: '+2'
  });

  const quickActions = [
    {
      title: 'DNS Rules',
      description: 'Manage blocklists and routing',
      icon: '🚫',
      link: '/dashboard/rules',
      count: stats.activeRules
    },
    {
      title: 'Domain Management',
      description: 'Add and configure domains',
      icon: '🌐',
      link: '/dashboard/domains',
      count: stats.managedDomains
    },
    {
      title: 'Analytics',
      description: 'View traffic analytics',
      icon: '📊',
      link: '/dashboard/analytics',
      count: '24h'
    },
    {
      title: 'User Management',
      description: 'Manage user access',
      icon: '👥',
      link: '/dashboard/users',
      count: stats.activeUsers
    },
    {
      title: 'Reports',
      description: 'Generate detailed reports',
      icon: '📈',
      link: '/dashboard/reports',
      count: 'PDF/CSV'
    },
    {
      title: 'Subscription',
      description: 'Manage SaaS access',
      icon: '💳',
      link: '/dashboard/subscription',
      count: 'Active'
    }
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
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-600">Manage your DNS infrastructure from this central dashboard.</p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Quick Actions */}
          <QuickActions actions={quickActions} />

          {/* Main Dashboard Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity />
            <SystemOverview />
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
