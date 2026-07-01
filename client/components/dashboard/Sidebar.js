'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import config from '../../config/keys';
import { isLocalNetwork } from '../../services/networkDetection';
import useAuthStore from '../../stores/authStore';

// Full Access (4) or Manage Users (5) — matches the server's PermissionGuard.canAccess(4, 5) on /api/users and /api/roles
const USERS_NAV_PERMISSION_CODES = [4, 5];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0 });
  const itemRefs = useRef({});
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard', tooltip: 'Main Dashboard' },
    { id: 'domains', label: 'Create Custom LAN Domain', icon: 'domains', href: '/dashboard/domains', tooltip: 'Create Custom LAN Domains' },
    { id: 'access-control', label: 'Access Control', icon: 'access-control', href: '/dashboard/access-control', tooltip: 'Manage Access & Blocking' },
    { id: 'cache', label: 'DNS Cache', icon: 'cache', href: '/dashboard/cache', tooltip: 'View & Manage DNS Cache' },
    { id: 'logs', label: 'Query Logs', icon: 'logs', href: '/dashboard/logs', tooltip: 'View DNS Query Logs' },
    { id: 'devices', label: 'Connected Devices', icon: 'devices', href: '/dashboard/devices', tooltip: 'View Connected Devices', localOnly: true },
    { id: 'users', label: 'Users & Roles', icon: 'users', href: '/dashboard/users', tooltip: 'Manage Users & Roles', requiresPermission: true },
    { id: 'settings', label: 'Server Settings', icon: 'settings', href: '/dashboard/settings', tooltip: 'DNS Server Settings' }
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.requiresPermission && !hasAnyPermission(USERS_NAV_PERMISSION_CODES)) {
      return false;
    }
    if (item.localOnly) {
      return isLocalNetwork();
    }
    return true;
  });

  const icons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
      </svg>
    ),
    domains: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
      </svg>
    ),
    'access-control': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    cache: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    logs: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    devices: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m4-2h-8m10-6h2m-2 0a2 2 0 00-2-2h-4a2 2 0 00-2 2h8zm0 0a2 2 0 012 2v4a2 2 0 01-2 2h-8a2 2 0 01-2-2v-4a2 2 0 012-2h8z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-4-4 4 4 0 014 4zm6 4a4 4 0 10-4-4" />
      </svg>
    )
  };

  const handleMouseEnter = (itemId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({ top: rect.top + rect.height / 2 });
    setHoveredItem(itemId);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <div className={`
      fixed top-0 left-0 h-full bg-[#090c12] border-r border-[rgba(130,165,220,0.1)] z-50 transition-all duration-300 ease-in-out flex flex-col
      ${isOpen ? 'w-64' : 'w-20 lg:w-20'}
      lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-[rgba(130,165,220,0.1)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#5b8cff] to-[#34e1d4] rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {isOpen && (
            <span className="font-bold text-[#e7eef6] tracking-tight animate-fade-in">
              {config.APP_NAME}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 overflow-visible">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id} className="relative">
              <Link
                href={item.href}
                ref={(el) => (itemRefs.current[item.id] = el)}
                className={`
                  w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 relative
                  ${pathname === item.href
                    ? 'bg-gradient-to-r from-[#5b8cff]/20 to-[#34e1d4]/10 text-[#5b8cff] border border-[rgba(91,140,255,0.2)]'
                    : 'text-[#9aa8bd] hover:bg-white/5 hover:text-[#e7eef6]'
                  }
                  ${!isOpen ? 'justify-center' : 'justify-start'}
                `}
                onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                onMouseLeave={handleMouseLeave}
              >
                <span className={`flex-shrink-0 ${pathname === item.href ? 'text-[#5b8cff]' : ''}`}>
                  {icons[item.icon]}
                </span>
                {isOpen && (
                  <span className="ml-3 text-sm font-medium animate-fade-in">
                    {item.label}
                  </span>
                )}
                {pathname === item.href && isOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5b8cff]"></span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="flex-shrink-0 p-3 border-t border-[rgba(130,165,220,0.1)]">
        <button
          className={`
            w-full flex items-center px-3 py-2.5 text-[#ff6071] hover:bg-[rgba(255,96,113,0.08)] rounded-lg transition-all duration-200 relative
            ${!isOpen ? 'justify-center' : 'justify-start'}
          `}
          onMouseEnter={(e) => handleMouseEnter('logout', e)}
          onMouseLeave={handleMouseLeave}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isOpen && (
            <span className="ml-3 text-sm font-medium animate-fade-in">Logout</span>
          )}
        </button>
      </div>

      {/* Tooltip */}
      {!isOpen && hoveredItem && (
        <div
          className="fixed left-20 px-3 py-2 bg-[#0d111a] border border-[rgba(130,165,220,0.18)] text-[#e7eef6] text-sm rounded-lg shadow-xl z-[9999] whitespace-nowrap animate-fade-in pointer-events-none ml-2"
          style={{
            top: tooltipPosition.top,
            transform: 'translateY(-50%)'
          }}
        >
          {hoveredItem === 'logout' ? 'Logout' : menuItems.find(item => item.id === hoveredItem)?.tooltip}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#0d111a] border-l border-b border-[rgba(130,165,220,0.18)] rotate-45"></div>
        </div>
      )}
    </div>
  );
}
