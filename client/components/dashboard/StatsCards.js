'use client';

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
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
  );
}