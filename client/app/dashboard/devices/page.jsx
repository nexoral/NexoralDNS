'use client';

import { useState } from 'react';
import ConnectedDevices from '../../../components/devices/ConnectedDevices';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import useAuthStore from '../../../stores/authStore';

export default function DevicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user: storeUser } = useAuthStore();

  // Ensure we have a properly structured user object for the Header component
  const user = {
    name: storeUser?.name || 'User',
    email: storeUser?.email || 'user@example.com',
    ...storeUser // Spread any other properties from the store user
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Connected Devices</h1>
            <p className="text-slate-600">Monitor all devices connected to your network</p>
          </div>

          <ConnectedDevices />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}