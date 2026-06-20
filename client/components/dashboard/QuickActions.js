'use client';

import Link from 'next/link';

export default function QuickActions({ actions }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-[#e7eef6] mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <Link key={action.title} href={action.link}>
            <div
              className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6 hover:border-[rgba(91,140,255,0.3)] hover:bg-[rgba(91,140,255,0.04)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{action.icon}</div>
                <span className="bg-[rgba(91,140,255,0.12)] text-[#5b8cff] px-2.5 py-1 rounded-full text-xs font-medium border border-[rgba(91,140,255,0.2)]">
                  {String(action.count || '0')}
                </span>
              </div>
              <h3 className="font-semibold text-[#cdd9e8] mb-2 text-sm">{action.title}</h3>
              <p className="text-xs text-[#7c8aa0]">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
