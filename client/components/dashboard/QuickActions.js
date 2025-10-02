'use client';

import Link from 'next/link';

export default function QuickActions({ actions }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <Link key={action.title} href={action.link}>
            <div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{action.icon}</div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {String(action.count || '0')}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">{action.title}</h3>
              <p className="text-sm text-slate-600">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
