'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';

export default function LogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  // Filter state
  const [filters, setFilters] = useState({
    queryName: '',
    timestamp: '',
    SourceIP: '',
    Status: '',
    From: ''
  });

  // Dummy logs data - replace with API call later
  const [allLogs] = useState([
    {
      _id: '6931d193cf8734efa090af41',
      queryName: 'default.exp-tas.com',
      queryType: 'A',
      timestamp: 1764872590573,
      SourceIP: '10.85.131.216',
      Status: 'DNS REQUEST FORWARDED',
      From: 'Level3 DNS',
      duration: 300.44
    },
    {
      _id: '6931d193cf8734efa090af42',
      queryName: 'google.com',
      queryType: 'A',
      timestamp: 1764872591000,
      SourceIP: '192.168.1.100',
      Status: 'RESOLVED',
      From: 'Cloudflare DNS',
      duration: 15.23
    },
    {
      _id: '6931d193cf8734efa090af43',
      queryName: 'example.org',
      queryType: 'AAAA',
      timestamp: 1764872592000,
      SourceIP: '192.168.1.105',
      Status: 'DNS REQUEST FORWARDED',
      From: 'Google DNS',
      duration: 25.67
    },
    {
      _id: '6931d193cf8734efa090af44',
      queryName: 'failed-domain.test',
      queryType: 'A',
      timestamp: 1764872593000,
      SourceIP: '192.168.1.110',
      Status: 'FAILED TO PROCESS',
      From: '',
      duration: 500.12
    },
    {
      _id: '6931d193cf8734efa090af45',
      queryName: 'github.com',
      queryType: 'A',
      timestamp: 1764872594000,
      SourceIP: '10.85.131.220',
      Status: 'DNS REQUEST FORWARDED',
      From: 'Cloudflare DNS',
      duration: 18.45
    },
    // Add more dummy data for pagination demo
    ...Array.from({ length: 50 }, (_, i) => ({
      _id: `dummy-${i}`,
      queryName: `domain-${i}.example.com`,
      queryType: i % 2 === 0 ? 'A' : 'AAAA',
      timestamp: 1764872595000 + i * 1000,
      SourceIP: `192.168.1.${100 + i}`,
      Status: ['DNS REQUEST FORWARDED', 'RESOLVED', 'FAILED TO PROCESS'][i % 3],
      From: ['Cloudflare DNS', 'Google DNS', 'Level3 DNS'][i % 3],
      duration: Math.random() * 500
    }))
  ]);

  // Apply filters
  const filteredLogs = allLogs.filter(log => {
    if (filters.queryName && !log.queryName.toLowerCase().includes(filters.queryName.toLowerCase())) {
      return false;
    }
    if (filters.SourceIP && !log.SourceIP.includes(filters.SourceIP)) {
      return false;
    }
    if (filters.Status && log.Status !== filters.Status) {
      return false;
    }
    if (filters.From && !log.From.toLowerCase().includes(filters.From.toLowerCase())) {
      return false;
    }
    if (filters.timestamp) {
      const filterDate = new Date(filters.timestamp).setHours(0, 0, 0, 0);
      const logDate = new Date(log.timestamp).setHours(0, 0, 0, 0);
      if (logDate !== filterDate) {
        return false;
      }
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setFilters({
      queryName: '',
      timestamp: '',
      SourceIP: '',
      Status: '',
      From: ''
    });
    setCurrentPage(1);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusBadgeColor = (status) => {
    if (status.includes('FORWARDED')) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status.includes('RESOLVED')) return 'bg-green-100 text-green-700 border-green-300';
    if (status.includes('FAILED')) return 'bg-red-100 text-red-700 border-red-300';
    if (status.includes('SERVICE_DOWN')) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const Pagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center text-sm text-slate-600">
          Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} logs
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Previous
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="px-3 py-1 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                1
              </button>
              {startPage > 2 && <span className="text-slate-400">...</span>}
            </>
          )}

          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => setCurrentPage(number)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentPage === number
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {number}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="text-slate-400">...</span>}
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-1 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
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
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">DNS Query Logs</h1>
            <p className="text-slate-600">View and analyze DNS query history with advanced filtering</p>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Query Name Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Domain Name</label>
                <input
                  type="text"
                  value={filters.queryName}
                  onChange={(e) => handleFilterChange('queryName', e.target.value)}
                  placeholder="Search domain..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Source IP Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source IP</label>
                <input
                  type="text"
                  value={filters.SourceIP}
                  onChange={(e) => handleFilterChange('SourceIP', e.target.value)}
                  placeholder="e.g., 192.168.1.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={filters.Status}
                  onChange={(e) => handleFilterChange('Status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="DNS REQUEST FORWARDED">DNS REQUEST FORWARDED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="FAILED TO PROCESS">FAILED TO PROCESS</option>
                  <option value="SERVICE_DOWN">SERVICE_DOWN</option>
                </select>
              </div>

              {/* DNS Server Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">DNS Server</label>
                <input
                  type="text"
                  value={filters.From}
                  onChange={(e) => handleFilterChange('From', e.target.value)}
                  placeholder="e.g., Cloudflare DNS"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Timestamp Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={filters.timestamp}
                  onChange={(e) => handleFilterChange('timestamp', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Query Logs
                <span className="ml-3 text-sm font-normal text-slate-500">
                  ({filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'})
                </span>
              </h2>
            </div>

            {currentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No logs found matching your filters
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Client IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          DNS Server
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-slate-700">{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-800 max-w-xs truncate" title={log.queryName}>
                              {log.queryName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-mono text-slate-700">{log.SourceIP || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(log.Status)}`}>
                              {log.Status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm text-slate-700">{log.duration?.toFixed(0) || '0'} ms</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                              </svg>
                              <span className="text-sm text-slate-600">{log.From || 'N/A'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-200">
                  {currentLogs.map((log) => (
                    <div key={log._id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 mb-1 break-all">{log.queryName}</div>
                          <div className="flex items-center text-xs text-slate-500 mb-1">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimestamp(log.timestamp)}
                          </div>
                          <div className="flex items-center text-xs text-slate-600">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="font-mono">{log.SourceIP || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(log.Status)}`}>
                          {log.Status}
                        </span>
                        <div className="flex items-center text-slate-600 text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-slate-700 font-medium">Duration:</span>
                          <span className="ml-1">{log.duration?.toFixed(0) || '0'} ms</span>
                        </div>
                        <div className="flex items-center text-slate-600 text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                          <span className="text-slate-700 font-medium">DNS:</span>
                          <span className="ml-1">{log.From || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination />
              </>
            )}
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
