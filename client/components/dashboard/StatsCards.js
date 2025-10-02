'use client';

import { useEffect, useState } from 'react';

export default function StatsCards({ stats }) {
  const [animatedStats, setAnimatedStats] = useState({
    totalQueries: 0,
    activeRules: 0,
    managedDomains: 0,
    activeUsers: 0
  });

  useEffect(() => {
    // Ensure all stats are numbers, fallback to 0 if NaN
    const safeStats = {
      totalQueries: Number(stats.totalQueries) || 0,
      activeRules: Number(stats.activeRules) || 0,
      managedDomains: Number(stats.managedDomains) || 0,
      activeUsers: Number(stats.activeUsers) || 0
    };

    // Animate numbers on mount
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setAnimatedStats({
        totalQueries: Math.floor(safeStats.totalQueries * progress),
        activeRules: Math.floor(safeStats.activeRules * progress),
        managedDomains: Math.floor(safeStats.managedDomains * progress),
        activeUsers: Math.floor(safeStats.activeUsers * progress)
      });

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedStats(safeStats);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [stats]);

  const cards = [
    {
      title: 'Total Queries',
      value: animatedStats.totalQueries.toLocaleString(),
      change: stats.queriesChange || '+0%',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'blue',
      positive: true
    },
    {
      title: 'Active Rules',
      value: animatedStats.activeRules.toString(),
      change: stats.rulesChange || '+0',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
      positive: true
    },
    {
      title: 'Managed Domains',
      value: animatedStats.managedDomains.toString(),
      change: stats.domainsChange || '+0',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      color: 'purple',
      positive: true
    },
    {
      title: 'Active Users',
      value: animatedStats.activeUsers.toString(),
      change: stats.usersChange || '+0',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'red',
      positive: true
    }
  ];

  const colorClasses = {
    blue: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    green: { bg: 'from-green-500 to-green-600', text: 'text-green-600', light: 'bg-green-50' },
    red: { bg: 'from-red-500 to-red-600', text: 'text-red-600', light: 'bg-red-50' },
    purple: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-600', light: 'bg-purple-50' }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={card.title}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${colorClasses[card.color].light}`}>
              <div className={colorClasses[card.color].text}>
                {card.icon}
              </div>
            </div>
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${card.positive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            `}>
              {card.change}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
