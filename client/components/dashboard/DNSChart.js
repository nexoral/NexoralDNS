'use client';

import { useState, useEffect } from 'react';

export default function DNSChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('24h');

  // Dummy chart data
  const chartData = {
    '24h': [
      { time: '00:00', queries: 1200, blocked: 180 },
      { time: '04:00', queries: 800, blocked: 120 },
      { time: '08:00', queries: 2400, blocked: 350 },
      { time: '12:00', queries: 3200, blocked: 480 },
      { time: '16:00', queries: 2800, blocked: 420 },
      { time: '20:00', queries: 2000, blocked: 300 }
    ],
    '7d': [
      { time: 'Mon', queries: 18000, blocked: 2700 },
      { time: 'Tue', queries: 22000, blocked: 3300 },
      { time: 'Wed', queries: 19500, blocked: 2925 },
      { time: 'Thu', queries: 25000, blocked: 3750 },
      { time: 'Fri', queries: 28000, blocked: 4200 },
      { time: 'Sat', queries: 15000, blocked: 2250 },
      { time: 'Sun', queries: 12000, blocked: 1800 }
    ],
    '30d': [
      { time: 'Week 1', queries: 140000, blocked: 21000 },
      { time: 'Week 2', queries: 156000, blocked: 23400 },
      { time: 'Week 3', queries: 148000, blocked: 22200 },
      { time: 'Week 4', queries: 162000, blocked: 24300 }
    ]
  };

  const currentData = chartData[selectedPeriod];
  const maxQueries = Math.max(...currentData.map(d => d.queries));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">DNS Query Analytics</h3>
          <p className="text-sm text-slate-600">Query volume and blocking statistics</p>
        </div>

        {/* Time Period Selector */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          {['24h', '7d', '30d'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${selectedPeriod === period
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between space-x-2">
          {currentData.map((data, index) => (
            <div key={data.time} className="flex-1 flex flex-col items-center">
              {/* Bars */}
              <div className="relative w-full max-w-12 mb-2">
                {/* Total Queries Bar */}
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-1000 ease-out"
                  style={{
                    height: `${(data.queries / maxQueries) * 200}px`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
                {/* Blocked Queries Bar */}
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-1000 ease-out"
                  style={{
                    height: `${(data.blocked / maxQueries) * 200}px`,
                    animationDelay: `${index * 100 + 50}ms`
                  }}
                />
              </div>

              {/* Time Label */}
              <span className="text-xs text-slate-600 font-medium">{data.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
          <span className="text-sm text-slate-600">Total Queries</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-red-400 rounded-full"></div>
          <span className="text-sm text-slate-600">Blocked Queries</span>
        </div>
      </div>
    </div>
  );
}
