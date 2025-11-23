'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function DNSQueryChart({ analytics }) {
  if (!analytics) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          DNS Query Distribution (24h)
        </h2>
        <div className="text-center py-8 text-slate-500">Loading...</div>
      </div>
    );
  }

  const data = [
    {
      name: 'Forwarded',
      value: analytics.totalForwardedDNS_Queries || 0,
      percentage: analytics.Percentages?.totalGlobalRequestForwardedPercentage || 0,
      color: '#3b82f6' // blue
    },
    {
      name: 'Failed',
      value: analytics.totalFailedDNS_Queries || 0,
      percentage: analytics.Percentages?.totalFailurePercentage || 0,
      color: '#ef4444' // red
    },
    {
      name: 'Success',
      value: analytics.totalSuccessDNS_Queries || 0,
      percentage: analytics.Percentages?.totalSuccessPercentage || 0,
      color: '#10b981' // green
    }
  ];

  const COLORS = data.map(item => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-800">{payload[0].name}</p>
          <p className="text-sm text-slate-600">
            Queries: <span className="font-medium">{payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-slate-600">
            Percentage: <span className="font-medium">{payload[0].payload.percentage.toFixed(2)}%</span>
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

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        DNS Query Distribution (24h)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
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
                fill="#8884d8"
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

        {/* Stats Summary */}
        <div className="flex flex-col justify-center space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-800">
                  {item.value.toLocaleString()}
                </div>
                <div className="text-sm text-slate-500">
                  {item.percentage.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-800">Total Queries</span>
              <span className="text-xl font-bold text-blue-600">
                {analytics.TotalLast24HourDNSqueries?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
