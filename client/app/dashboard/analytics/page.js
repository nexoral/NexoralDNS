'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  // Dummy analytics data
  const topDomains = [
    { domain: 'google.com', queries: 15420, percentage: 23.4, blocked: 0 },
    { domain: 'cloudflare.com', queries: 12850, percentage: 19.5, blocked: 45 },
    { domain: 'github.com', queries: 9650, percentage: 14.7, blocked: 12 },
    { domain: 'stackoverflow.com', queries: 7240, percentage: 11.0, blocked: 8 },
    { domain: 'youtube.com', queries: 6890, percentage: 10.5, blocked: 234 },
    { domain: 'amazon.com', queries: 5230, percentage: 7.9, blocked: 67 },
    { domain: 'microsoft.com', queries: 4560, percentage: 6.9, blocked: 23 },
    { domain: 'apple.com', queries: 4120, percentage: 6.3, blocked: 5 }
  ];

  const stats = {
    totalQueries: 65960,
    uniqueDomains: 2847,
    blockedQueries: 394,
    avgResponseTime: '24ms'
  };

  const handleExport = (format) => {
    // Placeholder for export functionality
    alert(`Exporting analytics data in ${format} format...`);
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
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Analytics</h1>
              <p className="text-slate-600">DNS query analytics and domain statistics</p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              {/* Export Buttons */}
              <Button
                onClick={() => handleExport('CSV')}
                variant="secondary"
                size="sm"
              >
                Export CSV
              </Button>
              <Button
                onClick={() => handleExport('PDF')}
                variant="secondary"
                size="sm"
              >
                Export PDF
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Queries</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalQueries.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Unique Domains</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.uniqueDomains.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Blocked Queries</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.blockedQueries}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Response</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.avgResponseTime}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Most Visited Domains Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Most Visited Domains</h2>
              <p className="text-sm text-slate-600">Top domains by query volume in the selected time range</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Queries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Blocked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {topDomains.map((domain, index) => (
                    <tr key={domain.domain} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{domain.domain}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{domain.queries.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-slate-900 mr-2">{domain.percentage}%</div>
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                              style={{ width: `${Math.min(domain.percentage * 4, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${domain.blocked > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {domain.blocked}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          View Details
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Block
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
