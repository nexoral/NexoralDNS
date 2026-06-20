'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DNSQueryChart({ analytics }) {
  if (!analytics) {
    return (
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
        <h2 className="text-base font-bold text-[#e7eef6] mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#5b8cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          DNS Query Distribution (24h)
        </h2>
        <div className="text-center py-8 text-[#7c8aa0] text-sm">Loading...</div>
      </div>
    );
  }

  const data = [
    {
      name: 'Forwarded',
      value: analytics.totalForwardedDNS_Queries || 0,
      percentage: analytics.Percentages?.totalGlobalRequestForwardedPercentage || 0,
      color: '#5b8cff'
    },
    {
      name: 'Failed',
      value: analytics.totalFailedDNS_Queries || 0,
      percentage: analytics.Percentages?.totalFailurePercentage || 0,
      color: '#ff6071'
    },
    {
      name: 'Success',
      value: analytics.totalSuccessDNS_Queries || 0,
      percentage: analytics.Percentages?.totalSuccessPercentage || 0,
      color: '#3ddc84'
    }
  ];

  const COLORS = data.map(item => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d111a] px-4 py-3 rounded-lg border border-[rgba(130,165,220,0.2)] shadow-xl">
          <p className="font-semibold text-[#e7eef6] text-sm">{payload[0].name}</p>
          <p className="text-xs text-[#9aa8bd] mt-1">
            Queries: <span className="font-medium text-[#cdd9e8]">{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-xs text-[#9aa8bd]">
            Share: <span className="font-medium text-[#cdd9e8]">{payload[0].payload.percentage.toFixed(2)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
      <h2 className="text-base font-bold text-[#e7eef6] mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-[#5b8cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        DNS Query Distribution (24h)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/4 transition-colors">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-[#cdd9e8] text-sm">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-[#e7eef6]">{item.value.toLocaleString()}</div>
                <div className="text-xs text-[#7c8aa0]">{item.percentage.toFixed(2)}%</div>
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-[rgba(130,165,220,0.1)]">
            <div className="flex items-center justify-between p-3 bg-[rgba(91,140,255,0.07)] rounded-lg border border-[rgba(91,140,255,0.15)]">
              <span className="font-semibold text-[#cdd9e8] text-sm">Total Queries</span>
              <span className="text-lg font-bold text-[#5b8cff]">
                {analytics.TotalLast24HourDNSqueries?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
