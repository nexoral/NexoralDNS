'use client';

export default function AnalyticsTab() {
  // Mock data - replace with API
  const stats = {
    totalBlocks: 1547,
    blocksToday: 234,
    blocksThisWeek: 1203,
    mostBlockedDomain: 'facebook.com',
    mostBlockedUser: '192.168.1.150'
  };

  const topBlockedDomains = [
    { domain: 'facebook.com', blocks: 423, percentage: 27 },
    { domain: 'instagram.com', blocks: 312, percentage: 20 },
    { domain: 'youtube.com', blocks: 245, percentage: 16 },
    { domain: 'tiktok.com', blocks: 189, percentage: 12 },
    { domain: 'twitter.com', blocks: 156, percentage: 10 }
  ];

  const topBlockedUsers = [
    { ip: '192.168.1.150', name: 'Kids Tablet', blocks: 567, percentage: 37 },
    { ip: '192.168.2.45', name: 'Guest Device', blocks: 234, percentage: 15 },
    { ip: '192.168.1.11', name: 'Office PC 2', blocks: 189, percentage: 12 },
    { ip: '192.168.1.200', name: 'Living Room TV', blocks: 145, percentage: 9 },
    { ip: '192.168.2.100', name: 'Unknown', blocks: 98, percentage: 6 }
  ];

  const recentBlockEvents = [
    { time: '2 minutes ago', ip: '192.168.1.150', domain: 'facebook.com', policy: 'Block Social Media for Kids' },
    { time: '5 minutes ago', ip: '192.168.2.45', domain: 'youtube.com', policy: 'Guest WiFi Restrictions' },
    { time: '8 minutes ago', ip: '192.168.1.150', domain: 'instagram.com', policy: 'Block Social Media for Kids' },
    { time: '12 minutes ago', ip: '192.168.1.11', domain: 'reddit.com', policy: 'Office Work Hours Policy' },
    { time: '15 minutes ago', ip: '192.168.1.200', domain: 'netflix.com', policy: 'Parental Controls' }
  ];

  // Mock chart data for blocks over time (last 7 days)
  const chartData = [
    { day: 'Mon', blocks: 145 },
    { day: 'Tue', blocks: 189 },
    { day: 'Wed', blocks: 234 },
    { day: 'Thu', blocks: 198 },
    { day: 'Fri', blocks: 267 },
    { day: 'Sat', blocks: 312 },
    { day: 'Sun', blocks: 234 }
  ];

  const maxBlocks = Math.max(...chartData.map(d => d.blocks));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Blocks</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.totalBlocks.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Blocks Today</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.blocksToday}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">This Week</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{stats.blocksThisWeek.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Chart - Blocks Over Time */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Blocks Over Time (Last 7 Days)</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {chartData.map((data, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '100%' }}>
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg absolute bottom-0 transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer group"
                  style={{ height: `${(data.blocks / maxBlocks) * 100}%` }}
                  title={`${data.blocks} blocks`}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.blocks} blocks
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2 font-medium">{data.day}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Blocked Domains */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Blocked Domains</h3>
          <div className="space-y-3">
            {topBlockedDomains.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.domain}</span>
                  <span className="text-sm text-slate-600">{item.blocks} blocks</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Blocked Users */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Blocked Users</h3>
          <div className="space-y-3">
            {topBlockedUsers.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-slate-700">{item.ip}</span>
                    <span className="text-xs text-slate-500 ml-2">({item.name})</span>
                  </div>
                  <span className="text-sm text-slate-600">{item.blocks} blocks</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Block Events */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Block Events</h3>
        <div className="space-y-3">
          {recentBlockEvents.map((event, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {event.ip} tried to access <span className="font-semibold">{event.domain}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Blocked by: {event.policy}</p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <p className="text-xs text-slate-500">{event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
