'use client';

import { useState } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import UserModal from '../../../components/users/UserModal';

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [user] = useState({ name: 'Admin User', email: 'admin@nexoraldns.com' });

  // Dummy users data with RBAC
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'John Admin',
      email: 'john@nexoraldns.com',
      role: 'Admin',
      status: 'active',
      lastLogin: '2024-01-20 14:30',
      created: '2024-01-01'
    },
    {
      id: 2,
      name: 'Sarah Manager',
      email: 'sarah@nexoraldns.com',
      role: 'Manager',
      status: 'active',
      lastLogin: '2024-01-20 09:15',
      created: '2024-01-05'
    },
    {
      id: 3,
      name: 'Mike Viewer',
      email: 'mike@nexoraldns.com',
      role: 'Viewer',
      status: 'active',
      lastLogin: '2024-01-19 16:45',
      created: '2024-01-10'
    },
    {
      id: 4,
      name: 'Lisa Operator',
      email: 'lisa@nexoraldns.com',
      role: 'Manager',
      status: 'inactive',
      lastLogin: '2024-01-15 11:20',
      created: '2024-01-08'
    }
  ]);

  const roles = {
    'Admin': {
      color: 'bg-red-100 text-red-800',
      permissions: ['Full system access', 'User management', 'System settings', 'All DNS operations']
    },
    'Manager': {
      color: 'bg-blue-100 text-blue-800',
      permissions: ['DNS management', 'View analytics', 'Generate reports', 'Manage domains']
    },
    'Viewer': {
      color: 'bg-green-100 text-green-800',
      permissions: ['View-only access', 'View analytics', 'Export reports']
    }
  };

  const handleAddUser = (newUser) => {
    const userWithId = {
      ...newUser,
      id: Date.now(),
      created: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };
    setUsers(prev => [...prev, userWithId]);
  };

  const handleDeleteUser = (id) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers(prev => prev.map(user =>
      user.id === updatedUser.id ? { ...user, ...updatedUser } : user
    ));
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">User Management</h1>
              <p className="text-slate-600">Manage users and role-based access control</p>
            </div>
            <Button onClick={() => setShowModal(true)} variant="primary">
              Add User
            </Button>
          </div>

          {/* Role Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Object.entries(roles).map(([role, config]) => {
              const count = users.filter(user => user.role === role).length;
              return (
                <div key={role} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{role}s</p>
                      <p className="text-2xl font-bold text-slate-800">{count}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                      {role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">System Users</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users.map((userData) => (
                    <tr key={userData.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {userData.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{userData.name}</div>
                            <div className="text-sm text-slate-500">{userData.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roles[userData.role].color}`}>
                          {userData.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${userData.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {userData.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{userData.lastLogin}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(userData)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Role Permissions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(roles).map(([role, config]) => (
                  <div key={role} className="border border-slate-200 rounded-lg p-4">
                    <h3 className={`font-semibold mb-3 px-3 py-1 rounded-full text-sm inline-block ${config.color}`}>
                      {role}
                    </h3>
                    <ul className="space-y-2">
                      {config.permissions.map((permission, index) => (
                        <li key={index} className="flex items-center text-sm text-slate-600">
                          <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {permission}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
          onSave={selectedUser ? handleUpdateUser : handleAddUser}
          roles={Object.keys(roles)}
        />
      )}
    </div>
  );
}
