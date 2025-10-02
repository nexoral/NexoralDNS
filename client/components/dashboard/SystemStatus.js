'use client';

import { useState, useEffect } from 'react';

export default function SystemStatus() {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  });

  // Animate metrics on mount
  useEffect(() => {
    const targetMetrics = {
      cpu: 34,
      memory: 67,
      disk: 45,
      network: 23
    };

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setMetrics({
        cpu: Math.floor(targetMetrics.cpu * progress),
        memory: Math.floor(targetMetrics.memory * progress),
        disk: Math.floor(targetMetrics.disk * progress),
        network: Math.floor(targetMetrics.network * progress)
      });

      if (step >= steps) {
        clearInterval(timer);
        setMetrics(targetMetrics);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  const systemData = [
    { name: 'CPU Usage', value: metrics.cpu, color: 'blue', icon: '🖥️' },
    { name: 'Memory', value: metrics.memory, color: 'green', icon: '💾' },
    { name: 'Disk Usage', value: metrics.disk, color: 'yellow', icon: '💿' },
    { name: 'Network', value: metrics.network, color: 'purple', icon: '🌐' }
  ];

  const getColorClasses = (color, value) => {
    const colors = {
      blue: value > 80 ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600',
      green: value > 80 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600',
      yellow: value > 80 ? 'from-red-500 to-red-600' : 'from-yellow-500 to-yellow-600',
      purple: value > 80 ? 'from-red-500 to-red-600' : 'from-purple-500 to-purple-600'
    };
    return colors[color];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">System Status</h3>
          <p className="text-sm text-slate-600">Real-time server metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">Online</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        {systemData.map((metric, index) => (
          <div key={metric.name} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{metric.icon}</span>
                <span className="text-sm font-medium text-slate-700">{metric.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">{metric.value}%</span>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 bg-gradient-to-r ${getColorClasses(metric.color, metric.value)} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">99.9%</p>
            <p className="text-xs text-slate-600">Uptime</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">156ms</p>
            <p className="text-xs text-slate-600">Avg Response</p>
          </div>
        </div>
      </div>
    </div>
  );
}
