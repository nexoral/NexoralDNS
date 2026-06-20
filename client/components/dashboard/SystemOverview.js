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
      default: return 'text-[#9aa8bd] bg-white/3';
    }
  };

  return (
    <div className="bg-[#0d111a] rounded-lg border border-[rgba(130,165,220,0.14)] p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-[#e7eef6]">System Overview</h2>
        <button className="text-sm text-[#5b8cff] hover:text-blue-800">View Details</button>
      </div>

      <div className="space-y-4">
        {/* Server Status */}
        <div className="flex justify-between p-3 bg-white/4 rounded-lg">
          <div>
            <span className="text-sm text-[#9aa8bd]">Server Status</span>
            <p className="font-medium text-[#e7eef6]">Operational</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* DNS Service */}
        <div className="flex justify-between p-3 bg-white/4 rounded-lg">
          <div>
            <span className="text-sm text-[#9aa8bd]">DNS Service</span>
            <p className="font-medium text-[#e7eef6]">Active</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* System Uptime */}
        <div className="flex justify-between p-3 bg-white/4 rounded-lg">
          <div>
            <span className="text-sm text-[#9aa8bd]">System Uptime</span>
            <p className="font-medium text-[#e7eef6]">99.9%</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full my-auto"></span>
        </div>

        {/* Last Backup */}
        <div className="flex justify-between p-3 bg-white/4 rounded-lg">
          <div>
            <span className="text-sm text-[#9aa8bd]">Last Backup</span>
            <p className="font-medium text-[#e7eef6]">2h ago</p>
          </div>
          <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full my-auto"></span>
        </div>
      </div>
    </div>
  );
}
