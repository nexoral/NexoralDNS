'use client';

export default function StatsCards({ stats }) {
  return (
    <div className="mb-8">
      {/* First Row - Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-4 lg:mb-6">
        {/* Total DNS Queries (Last 24 Hours) */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">DNS Queries (24h)</h3>
            <div className="bg-blue-200 rounded-full p-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-2">{stats.totalQueries?.toLocaleString() || 0}</div>
          <p className="text-xs text-blue-600">Total queries processed</p>
        </div>

        {/* Total Domains */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Total Domains</h3>
            <div className="bg-green-200 rounded-full p-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-2">{stats.totalDomains || 0}</div>
          <p className="text-xs text-green-600">Configured in system</p>
        </div>

        {/* Active Domains */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Active Domains</h3>
            <div className="bg-orange-200 rounded-full p-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-2">{stats.activeDomains || 0}</div>
          <p className="text-xs text-orange-600">Currently active</p>
        </div>

        {/* DNS Records */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">DNS Records</h3>
            <div className="bg-purple-200 rounded-full p-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-2">{stats.totalDNSRecords || 0}</div>
          <p className="text-xs text-purple-600">Total records</p>
        </div>
      </div>

      {/* Second Row - Query Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Forwarded Queries */}
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl shadow-sm border border-cyan-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Forwarded (24h)</h3>
            <div className="bg-cyan-200 rounded-full p-1.5">
              <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {stats.totalForwardedQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-cyan-600">Sent to upstream</p>
            <span className="text-xs font-semibold text-cyan-700 bg-cyan-200 px-2 py-0.5 rounded-full">
              {stats.forwardedPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>

        {/* Success Queries */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm border border-emerald-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Resolved (24h)</h3>
            <div className="bg-emerald-200 rounded-full p-1.5">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {stats.totalSuccessQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600">Successfully resolved</p>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
              {stats.successPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>

        {/* Failed Queries */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide">Failed (24h)</h3>
            <div className="bg-red-200 rounded-full p-1.5">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {stats.totalFailedQueries?.toLocaleString() || 0}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-600">Query errors</p>
            <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-0.5 rounded-full">
              {stats.failedPercentage?.toFixed(1) || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Third Row - Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:gap-6 mt-4 lg:mt-6">
        {/* Average DNS Resolve Time */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm border border-indigo-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Avg Resolve Time</h3>
            <div className="bg-indigo-200 rounded-full p-1.5">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {stats.avgResponseTime || 0} <span className="text-lg font-semibold text-indigo-600">ms</span>
          </div>
          <p className="text-xs text-indigo-600">
            {stats.totalRecordsConsideredForAvgDuration
              ? `Based on last ${stats.totalRecordsConsideredForAvgDuration} logs`
              : 'Average DNS query response'}
          </p>
        </div>
      </div>
    </div>
  );
}