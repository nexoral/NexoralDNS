'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import ChangePasswordModal from '../../../components/auth/ChangePasswordModal';
import useAuthStore from '../../../stores/authStore';

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user, role, permissions, passwordUpdatedAt } = useAuthStore();

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-1)] mb-2">Profile</h1>
            <p className="text-[var(--text-3)]">Your account details and security settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Identity Card */}
              <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--teal)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-1)]">{user?.username || 'User'}</h2>
                    <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(91,140,255,0.12)] text-[var(--blue)]">
                      {role?.name || 'No role assigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Card */}
              <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
                <h3 className="text-base font-semibold text-[var(--text-1)] mb-4">Security</h3>

                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-2)]">Password</p>
                    <p className="text-xs text-[var(--text-5)] mt-0.5">
                      {passwordUpdatedAt
                        ? `Last changed ${new Date(passwordUpdatedAt).toLocaleString()}`
                        : 'Using a temporary password — please change it'}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setShowPasswordModal(true)}>
                    Change Password
                  </Button>
                </div>

                {!passwordUpdatedAt && (
                  <div className="mt-4 bg-[rgba(246,179,82,0.07)] border border-[rgba(246,179,82,0.2)] rounded-lg p-4">
                    <p className="text-sm text-[var(--amber)]">
                      You're still using a temporary password. Change it to secure your account.
                    </p>
                  </div>
                )}
              </div>

              {/* Permissions Card */}
              <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
                <h3 className="text-base font-semibold text-[var(--text-1)] mb-1">Permissions</h3>
                <p className="text-xs text-[var(--text-5)] mb-4">Granted by your role — contact an administrator to request changes</p>

                {permissions?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {permissions.map((permission) => (
                      <span
                        key={permission._id || permission.code}
                        className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-2)]"
                      >
                        {permission.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-5)]">No permissions assigned</p>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Account Overview Card */}
              <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
                <h3 className="text-base font-semibold text-[var(--text-1)] mb-4">Account Overview</h3>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[var(--text-3)]">Status</dt>
                    <dd>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user?.isActive !== false
                          ? 'bg-[rgba(61,220,132,0.12)] text-[var(--green)]'
                          : 'bg-[rgba(255,96,113,0.12)] text-[var(--red)]'
                      }`}>
                        {user?.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[var(--text-3)]">Password</dt>
                    <dd>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        passwordUpdatedAt
                          ? 'bg-[rgba(61,220,132,0.12)] text-[var(--green)]'
                          : 'bg-[rgba(246,179,82,0.12)] text-[var(--amber)]'
                      }`}>
                        {passwordUpdatedAt ? 'Set' : 'Temporary'}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[var(--text-3)]">Role</dt>
                    <dd className="text-sm font-medium text-[var(--text-1)]">{role?.name || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[var(--text-3)]">Permissions</dt>
                    <dd className="text-sm font-medium text-[var(--text-1)]">{permissions?.length || 0}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-[var(--text-3)]">Member Since</dt>
                    <dd className="text-sm font-medium text-[var(--text-1)]">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Full Access Notice */}
              {permissions?.some((p) => p.code === 4) && (
                <div className="bg-[rgba(91,140,255,0.07)] border border-[rgba(91,140,255,0.2)] rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-[var(--blue)] mb-1">Full Access</h3>
                  <p className="text-xs text-[var(--text-3)]">
                    Your role grants unrestricted access to every module, bypassing individual permission checks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          isRequired={false}
          title="Change Password"
          description="Update your password to keep your account secure"
        />
      )}
    </div>
  );
}
