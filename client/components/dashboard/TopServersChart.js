'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TopServersChart({ topServers }) {
  if (!topServers || topServers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Top Global DNS Servers
        </h2>
        <div className="text-center py-8 text-slate-500">No data available</div>
      </div>
    );
  }

  // Color palette for bars
  const COLORS = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444'  // red
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-800 mb-1">{payload[0].payload.from}</p>
          <p className="text-sm text-slate-600">
            Requests: <span className="font-medium">{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-slate-600">
            Share: <span className="font-medium">{payload[0].payload.percentage.toFixed(2)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }) => {
    // Shorten DNS server names for better display
    const shortenName = (name) => {
      if (name.includes('Google')) return 'Google';
      if (name.includes('Cloudflare')) return 'Cloudflare';
      if (name.includes('OpenDNS')) return 'OpenDNS';
      if (name.includes('Level3')) return 'Level3';
      if (name.includes('Verisign')) return 'Verisign';
      if (name.includes('Neustar')) return 'Neustar';
      return name.split(' ')[0]; // Take first word
    };

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill="#475569"
          fontSize={12}
          transform="rotate(-35)"
          className="font-medium"
        >
          {shortenName(payload.value)}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Top Global DNS Servers (24h)
        </h2>
        <div className="text-sm text-slate-500">
          {topServers.length} server{topServers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topServers}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="from"
              tick={<CustomXAxisTick />}
              height={80}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {topServers.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Server List with Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topServers.map((server, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center flex-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate" title={server.from}>
                  {server.from}
                </div>
                <div className="text-xs text-slate-500">
                  {server.percentage.toFixed(2)}% share
                </div>
              </div>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <div className="text-sm font-bold text-slate-700">
                {server.count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">requests</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
