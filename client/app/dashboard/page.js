'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatsCards from '../../components/dashboard/StatsCards';
import QuickActions from '../../components/dashboard/QuickActions';
import NetworkOverview from '../../components/dashboard/NetworkOverview';
import RecentLogs from '../../components/dashboard/RecentLogs';
import DNSQueryChart from '../../components/dashboard/DNSQueryChart';
import TopServersChart from '../../components/dashboard/TopServersChart';
import ChangePasswordModal from '../../components/auth/ChangePasswordModal';
import useAuthStore from '../../stores/authStore';
import { isLocalNetwork } from '../../services/networkDetection';
import { api } from '../../services/api';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, passwordUpdatedAt } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [stats, setStats] = useState({
    totalQueries: 0,
    totalDomains: 0,
    activeDomains: 0,
    totalDNSRecords: 0,
    totalForwardedQueries: 0,
    totalSuccessQueries: 0,
    totalFailedQueries: 0,
    forwardedPercentage: 0,
    successPercentage: 0,
    failedPercentage: 0,
    avgResponseTime: 0,
    totalRecordsConsideredForAvgDuration: 0
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (passwordUpdatedAt === null || passwordUpdatedAt === undefined) {
      setShowPasswordModal(true);
    }
  }, [passwordUpdatedAt, user]);

  useEffect(() => {
    fetchDashboardAnalytics();
    const interval = setInterval(fetchDashboardAnalytics, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardAnalytics = async () => {
    try {
      const response = await api.getDashboardAnalytics();

      if (response.data.statusCode === 200 && response.data.data) {
        const data = response.data.data;

        // Store full analytics data for charts
        setAnalyticsData(data);

        setStats({
          totalQueries: data.TotalLast24HourDNSqueries || 0,
          totalDomains: data.totalDomains || 0,
          activeDomains: data.totalActiveDomains || 0,
          totalDNSRecords: data.totalDNSRecords || 0,
          totalForwardedQueries: data.totalForwardedDNS_Queries || 0,
          totalSuccessQueries: data.totalSuccessDNS_Queries || 0,
          totalFailedQueries: data.totalFailedDNS_Queries || 0,
          forwardedPercentage: data.Percentages?.totalGlobalRequestForwardedPercentage || 0,
          successPercentage: data.Percentages?.totalSuccessPercentage || 0,
          failedPercentage: data.Percentages?.totalFailurePercentage || 0,
          avgResponseTime: data.avgResponseTimeDuration || 0,
          totalRecordsConsideredForAvgDuration: data.totalRecordsConsideredForAvgDuration || 0
        });

        setRecentLogs(data.LatestLogs || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard analytics:', error);
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Custom LAN Domain',
      description: 'Create and configure custom LAN domains',
      icon: '🌐',
      link: '/dashboard/domains',
      count: stats.totalDomains
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
      count: 'View',
      localOnly: true
    }
  ].filter(action => {
    if (action.localOnly) {
      return isLocalNetwork();
    }
    return true;
  });

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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
              Welcome back, {user?.username ? user.username : 'User'}! 👋
            </h1>
            <p className="text-slate-600">Manage your DNS infrastructure efficiently.</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <StatsCards stats={stats} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <DNSQueryChart analytics={analyticsData} />
                <TopServersChart topServers={analyticsData?.TopGlobalServer || []} />
              </div>
            </>
          )}

          {isLocalNetwork() && (
            <div className="mb-8">
              <NetworkOverview />
            </div>
          )}

          <QuickActions actions={quickActions} />

          <div className="mb-8">
            <RecentLogs logs={recentLogs} />
          </div>

        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          isRequired={false}
          title="Update Your Password"
          description="For security reasons, please set a new password"
        />
      )}
    </div>
  );
}