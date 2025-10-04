'use client';

export default function SystemOverview() {
  const systemMetrics = [
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">System Overview</h2>
        <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
      </div>

      <div className="space-y-4">
        {/* Server Status */}
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm text-gray-600">Server Status</span>
            <p className="font-medium text-gray-800">Operational</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* DNS Service */}
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm text-gray-600">DNS Service</span>
            <p className="font-medium text-gray-800">Active</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* System Uptime */}
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm text-gray-600">System Uptime</span>
            <p className="font-medium text-gray-800">99.9%</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* Last Backup */}
        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm text-gray-600">Last Backup</span>
            <p className="font-medium text-gray-800">2h ago</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full my-auto"></span>
        </div>
      </div>
    </div>
  );
}
