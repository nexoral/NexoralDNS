'use client';

export default function TopDomains() {
  const domains = [
    { name: 'google.com', queries: 15420, percentage: 23.4, trend: 'up' },
    { name: 'cloudflare.com', queries: 12850, percentage: 19.5, trend: 'up' },
    { name: 'github.com', queries: 9650, percentage: 14.7, trend: 'down' },
    { name: 'stackoverflow.com', queries: 7240, percentage: 11.0, trend: 'up' },
    { name: 'youtube.com', queries: 6890, percentage: 10.5, trend: 'stable' },
    { name: 'amazon.com', queries: 5230, percentage: 7.9, trend: 'up' },
    { name: 'microsoft.com', queries: 4560, percentage: 6.9, trend: 'down' },
    { name: 'apple.com', queries: 4120, percentage: 6.3, trend: 'stable' }
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗️</span>;
      case 'down':
        return <span className="text-red-500">↘️</span>;
      case 'stable':
        return <span className="text-[var(--text-5)]">➡️</span>;
      default:
        return null;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-[var(--text-3)]';
      default:
        return 'text-[var(--text-3)]';
    }
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-1)]">Top Queried Domains</h3>
          <p className="text-sm text-[var(--text-3)]">Most requested domains in last 24h</p>
        </div>
        <button className="text-sm text-[var(--blue)] hover:text-blue-700 font-medium">
          View Report
        </button>
      </div>

      {/* Domains List */}
      <div className="space-y-3">
        {domains.map((domain, index) => (
          <div
            key={domain.name}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-1)] transition-colors animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Domain Info */}
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-1)] truncate">{domain.name}</p>
                <p className="text-xs text-[var(--text-5)]">{domain.queries.toLocaleString()} queries</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--text-1)]">{domain.percentage}%</p>
                <div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${domain.percentage * 4}%` }}
                  />
                </div>
              </div>
              <div className={`text-sm ${getTrendColor(domain.trend)}`}>
                {getTrendIcon(domain.trend)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-[var(--border-2)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-3)]">Total Unique Domains:</span>
          <span className="font-semibold text-[var(--text-1)]">2,847</span>
        </div>
      </div>
    </div>
  );
}
