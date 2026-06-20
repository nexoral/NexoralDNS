'use client';

export default function StatsCards({ stats }) {
  return (
    <div className="mb-8">
      {/* First Row - Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-4 lg:mb-6">
        {/* Total DNS Queries (Last 24 Hours) */}
        <div className="bg-[rgba(91,140,255,0.07)] rounded-xl border border-[rgba(91,140,255,0.18)] p-6 hover:border-[rgba(91,140,255,0.3)] hover:bg-[rgba(91,140,255,0.1)] transition-all duration-200 nd-rise">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#5b8cff] uppercase tracking-wide">DNS Queries (24h)</h3>
            <div className="bg-[rgba(91,140,255,0.18)] rounded-full p-2">
              <svg className="w-4 h-4 text-[#5b8cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#e7eef6] mb-2">{stats.totalQueries?.toLocaleString() || 0}</div>
          <p className="text-xs text-[#5b8cff]/80">Total queries processed</p>
        </div>

        {/* Total Domains */}
        <div className="bg-[rgba(61,220,132,0.07)] rounded-xl border border-[rgba(61,220,132,0.18)] p-6 hover:border-[rgba(61,220,132,0.3)] hover:bg-[rgba(61,220,132,0.1)] transition-all duration-200 nd-rise" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#3ddc84] uppercase tracking-wide">Total Domains</h3>
            <div className="bg-[rgba(61,220,132,0.18)] rounded-full p-2">
              <svg className="w-4 h-4 text-[#3ddc84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#e7eef6] mb-2">{stats.totalDomains || 0}</div>
          <p className="text-xs text-[#3ddc84]/80">Configured in system</p>
        </div>

        {/* Active Domains */}
        <div className="bg-[rgba(246,179,82,0.07)] rounded-xl border border-[rgba(246,179,82,0.18)] p-6 hover:border-[rgba(246,179,82,0.3)] hover:bg-[rgba(246,179,82,0.1)] transition-all duration-200 nd-rise" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#f6b352] uppercase tracking-wide">Active Domains</h3>
            <div className="bg-[rgba(246,179,82,0.18)] rounded-full p-2">
              <svg className="w-4 h-4 text-[#f6b352]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#e7eef6] mb-2">{stats.activeDomains || 0}</div>
          <p className="text-xs text-[#f6b352]/80">Currently active</p>
        </div>

        {/* DNS Records */}
        <div className="bg-[rgba(167,139,250,0.07)] rounded-xl border border-[rgba(167,139,250,0.18)] p-6 hover:border-[rgba(167,139,250,0.3)] hover:bg-[rgba(167,139,250,0.1)] transition-all duration-200 nd-rise" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wide">DNS Records</h3>
            <div className="bg-[rgba(167,139,250,0.18)] rounded-full p-2">
              <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-[#e7eef6] mb-2">{stats.totalDNSRecords || 0}</div>
          <p className="text-xs text-[#a78bfa]/80">Total records</p>
        </div>
      </div>

      {/* Second Row - Query Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Forwarded Queries */}
        <div className="bg-[rgba(52,225,212,0.07)] rounded-xl border border-[rgba(52,225,212,0.18)] p-5 hover:border-[rgba(52,225,212,0.3)] hover:bg-[rgba(52,225,212,0.1)] transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#34e1d4] uppercase tracking-wide">Forwarded (24h)</h3>
            <div className="bg-[rgba(52,225,212,0.18)] rounded-full p-1.5">
              <svg className="w-4 h-4 text-[#34e1d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#e7eef6] mb-1">
            {stats.totalForwardedQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#34e1d4]/80">Sent to upstream</p>
            <span className="text-xs font-semibold text-[#34e1d4] bg-[rgba(52,225,212,0.15)] px-2 py-0.5 rounded-full">
              {stats.forwardedPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>

        {/* Success Queries */}
        <div className="bg-[rgba(61,220,132,0.07)] rounded-xl border border-[rgba(61,220,132,0.18)] p-5 hover:border-[rgba(61,220,132,0.3)] hover:bg-[rgba(61,220,132,0.1)] transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#3ddc84] uppercase tracking-wide">Resolved (24h)</h3>
            <div className="bg-[rgba(61,220,132,0.18)] rounded-full p-1.5">
              <svg className="w-4 h-4 text-[#3ddc84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#e7eef6] mb-1">
            {stats.totalSuccessQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#3ddc84]/80">Successfully resolved</p>
            <span className="text-xs font-semibold text-[#3ddc84] bg-[rgba(61,220,132,0.15)] px-2 py-0.5 rounded-full">
              {stats.successPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>

        {/* Failed Queries */}
        <div className="bg-[rgba(255,96,113,0.07)] rounded-xl border border-[rgba(255,96,113,0.18)] p-5 hover:border-[rgba(255,96,113,0.3)] hover:bg-[rgba(255,96,113,0.1)] transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#ff6071] uppercase tracking-wide">Failed (24h)</h3>
            <div className="bg-[rgba(255,96,113,0.18)] rounded-full p-1.5">
              <svg className="w-4 h-4 text-[#ff6071]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#e7eef6] mb-1">
            {stats.totalFailedQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#ff6071]/80">Query errors</p>
            <span className="text-xs font-semibold text-[#ff6071] bg-[rgba(255,96,113,0.15)] px-2 py-0.5 rounded-full">
              {stats.failedPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Third Row - Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:gap-6 mt-4 lg:mt-6">
        <div className="bg-[rgba(91,140,255,0.07)] rounded-xl border border-[rgba(91,140,255,0.18)] p-5 hover:border-[rgba(91,140,255,0.3)] transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#5b8cff] uppercase tracking-wide">Avg Resolve Time</h3>
            <div className="bg-[rgba(91,140,255,0.18)] rounded-full p-1.5">
              <svg className="w-4 h-4 text-[#5b8cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#e7eef6] mb-1">
            {stats.avgResponseTime || 0} <span className="text-base font-semibold text-[#5b8cff]">ms</span>
          </div>
          <p className="text-xs text-[#5b8cff]/80">
            {stats.totalRecordsConsideredForAvgDuration
              ? `Based on last ${stats.totalRecordsConsideredForAvgDuration} logs`
              : 'Average DNS query response'}
          </p>
        </div>
      </div>
    </div>
  );
}
