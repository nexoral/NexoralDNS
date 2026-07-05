'use client';

import Link from 'next/link';

export default function RecentLogs({ logs }) {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusBadgeColor = (status) => {
    if (!status) return 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-4)]';
    if (status.includes('BLOCKED')) return 'bg-[rgba(255,96,113,0.15)] text-[var(--red)] border-[rgba(255,96,113,0.30)]';
    if (status.includes('FORWARDED')) return 'bg-[rgba(91,140,255,0.12)] text-[var(--blue)] border-[rgba(91,140,255,0.25)]';
    if (status.includes('RESOLVED')) return 'bg-[rgba(61,220,132,0.12)] text-[var(--green)] border-[rgba(61,220,132,0.25)]';
    if (status.includes('FAILED')) return 'bg-[rgba(255,96,113,0.12)] text-[var(--red)] border-[rgba(255,96,113,0.25)]';
    if (status.includes('SERVICE_DOWN')) return 'bg-[rgba(246,179,82,0.12)] text-[var(--amber)] border-[rgba(246,179,82,0.25)]';
    return 'bg-[var(--surface-2)] text-[var(--text-3)] border-[var(--border-4)]';
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-8">
        <h2 className="text-base font-bold text-[var(--text-1)] mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-[var(--blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Recent DNS Query Logs
        </h2>
        <p className="text-[var(--text-5)] text-center py-8 text-sm">No recent logs available</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] overflow-hidden">
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-1)] flex items-center">
            <svg className="w-5 h-5 mr-2 text-[var(--blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Recent DNS Query Logs
            <span className="ml-3 text-xs font-normal text-[var(--text-5)]">({logs.length} {logs.length === 1 ? 'query' : 'queries'})</span>
          </h2>
          <Link
            href="/dashboard/logs"
            className="text-xs text-[var(--blue)] hover:text-[var(--teal)] font-medium flex items-center transition-colors"
          >
            View All
            <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--surface-1)] border-b border-[var(--border)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">Client IP</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-5)] uppercase tracking-wider">DNS Server</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {logs.map((log, index) => (
              <tr key={log._id || index} className="hover:bg-[var(--surface-1)] transition-colors">
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-[var(--text-3)] font-mono">{formatTimestamp(log.timestamp)}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="text-sm font-medium text-[var(--text-2)] max-w-xs truncate font-mono" title={log.queryName}>
                    {log.queryName}
                  </div>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-mono text-[var(--text-3)]">{log.SourceIP || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(log.Status)}`}>
                    {log.Status}
                  </span>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs text-[var(--text-3)]">{log.duration?.toFixed(0) || '0'} ms</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-2 text-[var(--text-6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span className="text-xs text-[var(--text-5)] font-mono">{log.From}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-[var(--border)]">
        {logs.map((log, index) => (
          <div key={log._id || index} className="p-4 hover:bg-[var(--surface-1)] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-medium text-[var(--text-2)] mb-1 break-all text-sm font-mono">{log.queryName}</div>
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
                <span className="text-[var(--text-5)] font-medium">Duration:</span>
                <span className="ml-1">{log.duration?.toFixed(0) || '0'} ms</span>
              </div>
              <div className="flex items-center text-[var(--text-3)] text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="text-[var(--text-5)] font-medium">DNS:</span>
                <span className="ml-1 font-mono">{log.From}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
