'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import api from '../../../services/api';

export default function LogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    queryName: '',
    SourceIP: '',
    Status: '',
    from: '',
    to: '',
    durationFrom: '',
    durationTo: ''
  });

  const lastScrollY = useRef(0);

  // Load logs function
  const loadLogs = async (pageNum, isNewSearch = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 25,
      };

      if (filters.queryName) params.queryName = filters.queryName;
      if (filters.SourceIP) params.SourceIP = filters.SourceIP;
      if (filters.Status) params.Status = filters.Status;
      if (filters.from) params.from = new Date(filters.from).getTime();
      if (filters.to) params.to = new Date(filters.to).getTime();
      if (filters.durationFrom) params.durationFrom = filters.durationFrom;
      if (filters.durationTo) params.durationTo = filters.durationTo;

      const response = await api.getLogs(params);
      const newLogs = response.data.data || [];

      if (isNewSearch) {
        setLogs(newLogs);
        setPage(1);
        setHasMore(newLogs.length === 25);
      } else {
        // Only append if not duplicates
        setLogs(prev => {
          const existingIds = new Set(prev.map(log => log._id));
          const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log._id));
          return [...prev, ...uniqueNewLogs];
        });
        setHasMore(newLogs.length === 25);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load initial logs
  useEffect(() => {
    loadLogs(1, true);
  }, [filters]);

  // Scroll handler - only load when scrolling DOWN
  useEffect(() => {
    let timeoutId;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Check if scrolling down
      const isScrollingDown = currentScrollY > lastScrollY.current;
      lastScrollY.current = currentScrollY;

      // Only proceed if scrolling down
      if (!isScrollingDown) return;

      if (loading || !hasMore) return;

      const scrollTop = currentScrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Only load if near bottom
      if (scrollTop + windowHeight >= docHeight - 300) {
        // Debounce to prevent multiple calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const nextPage = page + 1;
          setPage(nextPage);
          loadLogs(nextPage, false);
        }, 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [loading, hasMore, page]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      queryName: '',
      SourceIP: '',
      Status: '',
      from: '',
      to: '',
      durationFrom: '',
      durationTo: ''
    });
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

              {/* From Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
                <input
                  type="datetime-local"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* To Date Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
                <input
                  type="datetime-local"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Duration From Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Min Duration (ms)</label>
                <input
                  type="number"
                  value={filters.durationFrom}
                  onChange={(e) => handleFilterChange('durationFrom', e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Duration To Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Duration (ms)</label>
                <input
                  type="number"
                  value={filters.durationTo}
                  onChange={(e) => handleFilterChange('durationTo', e.target.value)}
                  placeholder="e.g., 500"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Query Logs
                  <span className="ml-3 text-sm font-normal text-slate-500">
                    ({logs.length.toLocaleString()} loaded)
                  </span>
                </h2>
              </div>
            </div>

            {logs.length === 0 && loading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium mb-2">No logs found</p>
                <p className="text-sm text-slate-500">Try adjusting your filters or search criteria</p>
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
                      {logs.map((log) => (
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
                  {logs.map((log) => (
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

                {/* Infinite Scroll Loading Indicator */}
                {loading && logs.length > 0 && (
                  <div className="p-6 text-center border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-slate-600">Loading more logs...</span>
                    </div>
                  </div>
                )}

                {/* End of List Indicator */}
                {!hasMore && logs.length > 0 && (
                  <div className="p-6 text-center border-t border-slate-200 bg-slate-50">
                    <p className="text-sm text-slate-500">
                      You've reached the end of the logs
                    </p>
                  </div>
                )}
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
