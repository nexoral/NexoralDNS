'use client';

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
      {/* Total DNS Queries */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm text-gray-500 uppercase tracking-wide">Total DNS Queries</h3>
        <div className="flex items-center mt-1">
          <div className="text-2xl font-bold text-slate-800">{stats.totalQueries.toLocaleString()}</div>
          <div className="ml-2 text-xs font-medium text-green-600 bg-green-100 rounded-full px-2 py-0.5">
            {stats.queriesChange}
          </div>
        </div>
      </div>

      {/* Managed Domains */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm text-gray-500 uppercase tracking-wide">Managed Domains</h3>
        <div className="flex items-center mt-1">
          <div className="text-2xl font-bold text-slate-800">{stats.managedDomains}</div>
          <div className="ml-2 text-xs font-medium text-green-600 bg-green-100 rounded-full px-2 py-0.5">
            {stats.domainsChange}
          </div>
        </div>
      </div>
    </div>
  );
}