'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import api from '../../../services/api';

const EXPORT_POLL_INTERVAL_MS = 5000;

export default function LogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  const [cursor, setCursor] = useState(null);
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

  const [exportStatus, setExportStatus] = useState(null); // null | { status, format, ... }
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRequestingExport, setIsRequestingExport] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const exportMenuRef = useRef(null);

  const lastScrollY = useRef(0);

  // Load logs function
  const loadLogs = async (cursorId = null, isNewSearch = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const params = {
        limit: 25,
      };

      // Add cursor for pagination (only if not a new search)
      if (cursorId && !isNewSearch) {
        params.cursor = cursorId;
      }

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
        setCursor(newLogs.length > 0 ? newLogs[newLogs.length - 1]._id : null);
        setHasMore(newLogs.length === 25);
      } else {
        // Only append if not duplicates
        setLogs(prev => {
          const existingIds = new Set(prev.map(log => log._id));
          const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log._id));
          return [...prev, ...uniqueNewLogs];
        });
        // Update cursor to the last document's _id
        if (newLogs.length > 0) {
          setCursor(newLogs[newLogs.length - 1]._id);
        }
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
    loadLogs(null, true);
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
          loadLogs(cursor, false);
        }, 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [loading, hasMore, cursor]);

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

  // Extract the error message from an axios error whose response was requested
  // as a blob (download endpoint) — the JSON error body arrives as a Blob, not
  // a parsed object, so it needs to be read and parsed manually.
  const parseBlobErrorMessage = async (error, fallback) => {
    const data = error?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed?.data?.error || parsed?.message || fallback;
      } catch {
        return fallback;
      }
    }
    return error?.response?.data?.data?.error || error?.response?.data?.message || fallback;
  };

  const fetchExportStatus = async () => {
    try {
      const response = await api.getExportStatus();
      setExportStatus(response.data.data?.export || null);
    } catch (err) {
      console.error('Error fetching export status:', err);
    }
  };

  // Check export status on mount so a completed export from a previous visit still shows "Download"
  useEffect(() => {
    fetchExportStatus();
  }, []);

  // Poll while an export is being prepared so the button updates without a manual refresh
  useEffect(() => {
    if (exportStatus?.status !== 'queued' && exportStatus?.status !== 'processing') return;

    const interval = setInterval(fetchExportStatus, EXPORT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [exportStatus?.status]);

  // Close the export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildCurrentFilterParams = () => {
    const params = {};
    if (filters.queryName) params.queryName = filters.queryName;
    if (filters.SourceIP) params.SourceIP = filters.SourceIP;
    if (filters.Status) params.Status = filters.Status;
    if (filters.from) params.from = new Date(filters.from).getTime();
    if (filters.to) params.to = new Date(filters.to).getTime();
    if (filters.durationFrom) params.durationFrom = filters.durationFrom;
    if (filters.durationTo) params.durationTo = filters.durationTo;
    return params;
  };

  const handleRequestExport = async (format) => {
    setShowExportMenu(false);
    setIsRequestingExport(true);
    try {
      await api.requestLogExport({ format, ...buildCurrentFilterParams() });
      await fetchExportStatus();
    } catch (err) {
      console.error('Error requesting export:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to start export');
    } finally {
      setIsRequestingExport(false);
    }
  };

  const handleDownloadExport = async () => {
    setIsDownloading(true);
    try {
      const response = await api.downloadExport();
      const disposition = response.headers['content-disposition'] || '';
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch?.[1] || `logs-export.${exportStatus?.format || 'txt'}`;

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      // Server deletes the file + clears metadata on successful stream — resync local state
      setExportStatus(null);
      setTimeout(() => {
        fetchExportStatus().catch(() => {});
      }, 1500);
    } catch (err) {
      console.error('Error downloading export:', err);
      const message = await parseBlobErrorMessage(err, 'Failed to download export');
      toast.error(message);
      setExportStatus(null);
      setTimeout(() => {
        fetchExportStatus().catch(() => {});
      }, 1500);
    } finally {
      setIsDownloading(false);
    }
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
    if (!status) return 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-4)]';
    if (status.includes('FAIL-SAFE') || status.includes('FAIL_SAFE')) return 'bg-[rgba(246,179,82,0.12)] text-[var(--amber)] border-[rgba(246,179,82,0.25)]';
    if (status.includes('FORWARDED')) return 'bg-[rgba(91,140,255,0.12)] text-[var(--blue)] border-[rgba(91,140,255,0.25)]';
    if (status.includes('RESOLVED')) return 'bg-[rgba(61,220,132,0.12)] text-[var(--green)] border-[rgba(61,220,132,0.25)]';
    if (status.includes('FAILED')) return 'bg-[rgba(255,96,113,0.12)] text-[var(--red)] border-[rgba(255,96,113,0.25)]';
    if (status.includes('SERVICE_DOWN')) return 'bg-[rgba(246,179,82,0.12)] text-[var(--amber)] border-[rgba(246,179,82,0.25)]';
    return 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-4)]';
  };

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
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-1)] mb-2">DNS Query Logs</h1>
            <p className="text-[var(--text-3)]">View and analyze DNS query history with advanced filtering</p>
          </div>

          {/* Filters Section */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-1)]">Filters</h2>
              <button
                onClick={handleClearFilters}
                className="text-sm text-[var(--blue)] hover:text-[var(--teal)] font-medium"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Query Name Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Domain Name</label>
                <input
                  type="text"
                  value={filters.queryName}
                  onChange={(e) => handleFilterChange('queryName', e.target.value)}
                  placeholder="Search domain..."
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>

              {/* Source IP Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Source IP</label>
                <input
                  type="text"
                  value={filters.SourceIP}
                  onChange={(e) => handleFilterChange('SourceIP', e.target.value)}
                  placeholder="e.g., 192.168.1.1"
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Status</label>
                <select
                  value={filters.Status}
                  onChange={(e) => handleFilterChange('Status', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                >
                  <option value="">All Statuses</option>
                  <option value="DNS REQUEST FORWARDED">DNS REQUEST FORWARDED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="RESOLVED (FAIL-SAFE)">RESOLVED (FAIL-SAFE)</option>
                  <option value="FAILED TO PROCESS">FAILED TO PROCESS</option>
                  <option value="SERVICE_DOWN">SERVICE_DOWN</option>
                </select>
              </div>

              {/* From Date Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">From Date</label>
                <input
                  type="datetime-local"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>

              {/* To Date Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">To Date</label>
                <input
                  type="datetime-local"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>

              {/* Duration From Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Min Duration (ms)</label>
                <input
                  type="number"
                  value={filters.durationFrom}
                  onChange={(e) => handleFilterChange('durationFrom', e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>

              {/* Duration To Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Max Duration (ms)</label>
                <input
                  type="number"
                  value={filters.durationTo}
                  onChange={(e) => handleFilterChange('durationTo', e.target.value)}
                  placeholder="e.g., 500"
                  min="0"
                  className="w-full px-3 py-2 border border-[var(--border-4)] rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-transparent bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)]"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] overflow-hidden">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-1)] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[var(--blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Query Logs
                  <span className="ml-3 text-sm font-normal text-[var(--text-5)]">
                    ({logs.length.toLocaleString()} loaded)
                  </span>
                </h2>

                {exportStatus?.status === 'ready' ? (
                  <button
                    onClick={handleDownloadExport}
                    disabled={isDownloading}
                    className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[rgba(61,220,132,0.12)] text-[var(--green)] border border-[rgba(61,220,132,0.25)] hover:bg-[rgba(61,220,132,0.18)] transition-colors disabled:opacity-60"
                  >
                    {isDownloading ? 'Downloading...' : `Download Export (${exportStatus.format})`}
                  </button>
                ) : exportStatus?.status === 'queued' || exportStatus?.status === 'processing' ? (
                  <button
                    disabled
                    className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-2)] text-[var(--text-4)] border border-[var(--border-3)] cursor-not-allowed"
                  >
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {exportStatus.status === 'queued' ? 'Queued...' : 'Preparing export...'}
                  </button>
                ) : (
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => !isRequestingExport && handleRequestExport('txt')}
                      disabled={isRequestingExport}
                      className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-3)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-60"
                    >
                      {isRequestingExport ? 'Starting export...' : 'Export Logs (.txt)'}
                    </button>

                    {exportStatus?.status === 'failed' && (
                      <p className="absolute right-0 mt-1 text-xs text-[var(--red)] whitespace-nowrap">
                        Last export failed — try again
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {logs.length === 0 && loading ? (
              <div className="p-8 text-center text-[var(--text-5)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--blue)] mx-auto mb-4"></div>
                <p className="text-sm">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-3)] mb-4">
                  <svg className="w-8 h-8 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[var(--text-3)] font-medium mb-2">No logs found</p>
                <p className="text-sm text-[var(--text-5)]">Try adjusting your filters or search criteria</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--surface-1)] border-b border-[var(--border)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          Client IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                          DNS Server
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-[var(--surface-1)] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-[var(--text-2)]">{formatTimestamp(log.timestamp)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-[var(--text-1)] max-w-xs truncate" title={log.queryName}>
                              {log.queryName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-mono text-[var(--text-2)]">{log.SourceIP || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(log.Status)}`}>
                              {log.Status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm text-[var(--text-2)]">{log.duration?.toFixed(0) || '0'} ms</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                              </svg>
                              <span className="text-sm text-[var(--text-3)]">{log.From || 'N/A'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-[var(--border)]">
                  {logs.map((log) => (
                    <div key={log._id} className="p-4 hover:bg-[var(--surface-1)] transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-[var(--text-1)] mb-1 break-all">{log.queryName}</div>
                          <div className="flex items-center text-xs text-[var(--text-5)] mb-1">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimestamp(log.timestamp)}
                          </div>
                          <div className="flex items-center text-xs text-[var(--text-3)]">
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
                        <div className="flex items-center text-[var(--text-3)] text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-[var(--text-2)] font-medium">Duration:</span>
                          <span className="ml-1">{log.duration?.toFixed(0) || '0'} ms</span>
                        </div>
                        <div className="flex items-center text-[var(--text-3)] text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                          <span className="text-[var(--text-2)] font-medium">DNS:</span>
                          <span className="ml-1">{log.From || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Infinite Scroll Loading Indicator */}
                {loading && logs.length > 0 && (
                  <div className="p-6 text-center border-t border-[var(--border)] bg-[var(--surface-1)]">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 mr-2 text-[var(--blue)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-[var(--text-3)]">Loading more logs...</span>
                    </div>
                  </div>
                )}

                {/* End of List Indicator */}
                {!hasMore && logs.length > 0 && (
                  <div className="p-6 text-center border-t border-[var(--border)] bg-[var(--surface-1)]">
                    <p className="text-sm text-[var(--text-5)]">
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
