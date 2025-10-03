'use client';

export default function SystemOverview() {
  const systemMetrics = [
    { label: 'DNS Rules Active', value: '24', status: 'good' },
    { label: 'Domains Managed', value: '156', status: 'good' },
    { label: 'System Uptime', value: '99.9%', status: 'good' },
    { label: 'Query Response', value: '18ms', status: 'good' },
    { label: 'Last Backup', value: '2h ago', status: 'good' },
    { label: 'Server Status', value: 'Online', status: 'good' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">System Overview</h3>
          <p className="text-sm text-slate-600">Current system status and metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {systemMetrics.map((metric, index) => (
          <div
            key={metric.label}
            className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                <p className="text-lg font-semibold text-slate-800">{String(metric.value)}</p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(metric.status)}`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
