'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import useAuthStore from '../../../stores/authStore';
import { api } from '../../../services/api';

export default function DNSCachePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showClearSingleModal, setShowClearSingleModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [cachedRecords, setCachedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuthStore();

  // Fetch cache stats from API
  useEffect(() => {
    fetchCacheStats();
  }, []);

  const fetchCacheStats = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSkip(0);
      setCachedRecords([]);
    }
    setError(null);

    const currentSkip = isLoadMore ? skip : 0;

    try {
      const response = await api.getCacheStats({ skip: currentSkip, limit });
      if (response.data && response.data.statusCode === 200) {
        if (!isLoadMore) {
          setCacheStats(response.data.data);
        }

        // Parse records if available
        if (response.data.data.records && Array.isArray(response.data.data.records)) {
          const parsedRecords = response.data.data.records.map((record, index) => {
            // Parse the nested JSON value
            let recordData = {};
            try {
              recordData = JSON.parse(record.value);
            } catch (e) {
              recordData = { name: record.key, value: record.value, type: 'Unknown' };
            }

            return {
              id: currentSkip + index + 1,
              cacheKey: record.key,
              domain: recordData.name || record.key,
              recordType: recordData.type || 'Unknown',
              value: recordData.value || record.value,
              ttlRemaining: record.ttl || 0,
              expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
              size: record.size || '0 bytes'
            };
          });

          if (isLoadMore) {
            setCachedRecords(prev => [...prev, ...parsedRecords]);
          } else {
            setCachedRecords(parsedRecords);
          }

          // Check if there are more records to load
          setHasMore(parsedRecords.length === limit);
          if (isLoadMore) {
            setSkip(currentSkip + parsedRecords.length);
          } else {
            setSkip(parsedRecords.length);
          }
        } else {
          if (!isLoadMore) {
            setCachedRecords([]);
          }
          setHasMore(false);
        }
      } else {
        setError('Failed to fetch cache stats');
      }
    } catch (err) {
      console.error('Error fetching cache stats:', err);
      setError('Failed to fetch cache stats');
      if (!isLoadMore) {
        // Set default values on error
        setCacheStats({
          total_keys: 0,
          used_memory: '0B',
          keyspace_hits: 0,
          keyspace_misses: 0,
          hit_rate: '0%'
        });
        setCachedRecords([]);
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Calculate miss rate from hit rate
  const getMissRate = () => {
    if (!cacheStats) return '0%';
    const hitRate = parseFloat(cacheStats.hit_rate) || 0;
    return `${(100 - hitRate).toFixed(2)}%`;
  };

  const recordTypes = ['all', 'A', 'AAAA', 'CNAME'];

  const filteredRecords = cachedRecords.filter(record => {
    const matchesSearch = record.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = recordTypeFilter === 'all' || record.recordType === recordTypeFilter;
    return matchesSearch && matchesType;
  });

  const formatTTL = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatExpiryTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const handleClearSingle = (record) => {
    setSelectedRecord(record);
    setShowClearSingleModal(true);
  };

  const confirmClearSingle = async () => {
    try {
      const response = await api.deleteSpecificCache(selectedRecord.cacheKey);
      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 202)) {
        // Refresh cache stats after successful delete
        await fetchCacheStats(false);
      } else {
        setError('Failed to delete cache entry');
      }
    } catch (err) {
      console.error('Error deleting cache entry:', err);
      setError('Failed to delete cache entry');
    } finally {
      setShowClearSingleModal(false);
      setSelectedRecord(null);
    }
  };

  const confirmClearAll = async () => {
    try {
      const response = await api.deleteAllCache();
      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 202)) {
        // Refresh cache stats after successful delete
        await fetchCacheStats(false);
      } else {
        setError('Failed to clear all cache');
      }
    } catch (err) {
      console.error('Error clearing all cache:', err);
      setError('Failed to clear all cache');
    } finally {
      setShowClearAllModal(false);
    }
  };

  const getRecordTypeBadge = (type) => {
    const colors = {
      A: 'bg-blue-100 text-blue-700 border-blue-300',
      AAAA: 'bg-purple-100 text-purple-700 border-purple-300',
      CNAME: 'bg-green-100 text-green-700 border-green-300',
      MX: 'bg-orange-100 text-orange-700 border-orange-300',
      TXT: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      NS: 'bg-pink-100 text-pink-700 border-pink-300'
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-300';
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
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">DNS Cache Management</h1>
              <p className="text-slate-600">View and manage cached DNS records</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  fetchCacheStats(false);
                }}
                disabled={loading}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium flex items-center space-x-2"
                title="Refresh stats"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              {cachedRecords.length > 0 && (
                <Button
                  onClick={() => setShowClearAllModal(true)}
                  variant="danger"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Clear All Cache
                </Button>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : cacheStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Hit Rate</p>
                    <p className="text-2xl font-bold text-slate-800">{cacheStats.hit_rate || '0%'}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Miss Rate</p>
                    <p className="text-2xl font-bold text-slate-800">{getMissRate()}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search domain or IP address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Record Type Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                  {recordTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setRecordTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        recordTypeFilter === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cache Records Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Cached Records
                  <span className="ml-3 text-sm font-normal text-slate-500">
                    ({filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'})
                  </span>
                </h2>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium mb-2">No cached records found</p>
                <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Domain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          TTL Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Expires At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-800">{record.domain}</div>
                            <div className="text-xs text-slate-500">{record.size}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRecordTypeBadge(record.recordType)}`}>
                              {record.recordType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-mono text-slate-700 max-w-xs truncate" title={record.value}>
                              {record.value}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">{formatTTL(record.ttlRemaining)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-700">{formatExpiryTime(record.expiresAt)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleClearSingle(record)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                              title="Clear this cache entry"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-200">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 mb-1 break-all">{record.domain}</div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRecordTypeBadge(record.recordType)}`}>
                              {record.recordType}
                            </span>
                            <span className="text-xs text-slate-500">{record.size}</span>
                          </div>
                          <div className="text-sm font-mono text-slate-700 break-all">{record.value}</div>
                        </div>
                        <button
                          onClick={() => handleClearSingle(record)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0 ml-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-500">TTL:</span> {formatTTL(record.ttlRemaining)}
                        </div>
                        <div>
                          <span className="text-slate-500">Expires:</span> {formatExpiryTime(record.expiresAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && filteredRecords.length > 0 && (
                  <div className="p-6 border-t border-slate-200 flex justify-center">
                    <button
                      onClick={() => fetchCacheStats(true)}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      {loadingMore ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span>Load More</span>
                        </>
                      )}
                    </button>
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

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Clear All Cache?</h3>
              <p className="text-slate-600 text-center mb-6">
                This will remove all {cachedRecords.length?.toLocaleString() || 0} cached records. This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearAllModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAll}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Single Modal */}
      {showClearSingleModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Clear Cache Entry?</h3>
              <p className="text-slate-600 text-center mb-2">
                Remove cached record for:
              </p>
              <div className="bg-slate-50 rounded-lg p-3 mb-6">
                <p className="text-sm font-medium text-slate-800 text-center break-all">{selectedRecord.domain}</p>
                <p className="text-xs text-slate-600 text-center mt-1">{selectedRecord.recordType} → {selectedRecord.value}</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowClearSingleModal(false);
                    setSelectedRecord(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearSingle}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
