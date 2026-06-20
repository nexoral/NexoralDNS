'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TopServersChart({ topServers }) {
  if (!topServers || topServers.length === 0) {
    return (
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
        <h2 className="text-base font-bold text-[#e7eef6] mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Top Global DNS Servers
        </h2>
        <div className="text-center py-8 text-[#7c8aa0] text-sm">No data available</div>
      </div>
    );
  }

  const COLORS = ['#a78bfa', '#5b8cff', '#34e1d4', '#3ddc84', '#f6b352', '#ff6071'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d111a] px-4 py-3 rounded-lg border border-[rgba(130,165,220,0.2)] shadow-xl">
          <p className="font-semibold text-[#e7eef6] text-sm mb-1">{payload[0].payload.from}</p>
          <p className="text-xs text-[#9aa8bd]">
            Requests: <span className="font-medium text-[#cdd9e8]">{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-xs text-[#9aa8bd]">
            Share: <span className="font-medium text-[#cdd9e8]">{payload[0].payload.percentage.toFixed(2)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }) => {
    const shortenName = (name) => {
      if (name.includes('Google')) return 'Google';
      if (name.includes('Cloudflare')) return 'Cloudflare';
      if (name.includes('OpenDNS')) return 'OpenDNS';
      if (name.includes('Level3')) return 'Level3';
      if (name.includes('Verisign')) return 'Verisign';
      if (name.includes('Neustar')) return 'Neustar';
      return name.split(' ')[0];
    };
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="end" fill="#7c8aa0" fontSize={11} transform="rotate(-35)">
          {shortenName(payload.value)}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-[#e7eef6] flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Top Global DNS Servers (24h)
        </h2>
        <div className="text-xs text-[#7c8aa0]">
          {topServers.length} server{topServers.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topServers} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(130,165,220,0.08)" />
            <XAxis dataKey="from" tick={<CustomXAxisTick />} height={80} />
            <YAxis stroke="#5f6b7d" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(130,165,220,0.05)' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {topServers.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {topServers.map((server, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg border border-[rgba(130,165,220,0.1)] hover:border-[rgba(130,165,220,0.2)] hover:bg-white/3 transition-all"
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#cdd9e8] truncate" title={server.from}>{server.from}</div>
                <div className="text-xs text-[#7c8aa0]">{server.percentage.toFixed(2)}% share</div>
              </div>
            </div>
            <div className="text-right ml-3 flex-shrink-0">
              <div className="text-sm font-bold text-[#e7eef6]">{server.count.toLocaleString()}</div>
              <div className="text-xs text-[#7c8aa0]">req</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
