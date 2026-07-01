'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import ConfirmationModal from '../ui/ConfirmationModal';
import UserModal from './UserModal';
import ResetPasswordModal from './ResetPasswordModal';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

export default function UsersTab() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUsers({ skip: 0, limit: 100 });
      setUsers(response.data.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.getRoles({ skip: 0, limit: 100 });
      setRoles(response.data.data.roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      toast.error('Failed to load roles');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreateUser = async (formData) => {
    try {
      const response = await api.createUser({
        username: formData.username,
        password: formData.password,
        roleId: formData.roleId,
      });
      toast.success(response.data.data.message || 'User created successfully');
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId, formData) => {
    try {
      const response = await api.updateUser(userId, {
        username: formData.username,
        roleId: formData.roleId,
        isActive: formData.isActive,
      });
      toast.success(response.data.data?.message || 'User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    try {
      const response = await api.resetUserPassword(userId, newPassword);
      toast.success(response.data.data.message || 'Password reset successfully');
      setResettingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await api.deleteUser(deletingUser._id);
      toast.success(response.data.data.message || 'User deleted successfully');
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to delete user');
      setDeletingUser(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#e7eef6]">Users</h3>
          <p className="text-sm text-[#9aa8bd] mt-1">Create users with a temporary password — they'll be required to set their own on first login</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-[#9aa8bd]">Loading users...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-[rgba(255,96,113,0.07)] rounded-lg border-2 border-red-200">
          <p className="text-[#ff6071] mb-4">{error}</p>
          <Button onClick={fetchUsers}>Retry</Button>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-[#07090e] rounded-lg border-2 border-dashed border-[rgba(130,165,220,0.14)]">
          <h3 className="text-lg font-medium text-[#e7eef6] mb-2">No users found</h3>
          <p className="text-[#9aa8bd] mb-4">Add your first user to get started</p>
          <Button onClick={() => setShowModal(true)}>Add User</Button>
        </div>
      ) : (
        <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#07090e]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#7c8aa0] uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#7c8aa0] uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#7c8aa0] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#7c8aa0] uppercase">Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#7c8aa0] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#0d111a] divide-y divide-[rgba(130,165,220,0.08)]">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-[#07090e]">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {u.username?.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4 text-sm font-medium text-[#e7eef6]">
                            {u.username}{isSelf && <span className="text-xs text-[#7c8aa0] ml-2">(you)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[rgba(91,140,255,0.12)] text-[#5b8cff]">
                          {u.role?.name || 'No role'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.isActive !== false
                            ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84]'
                            : 'bg-[rgba(255,96,113,0.12)] text-[#ff6071]'
                        }`}>
                          {u.isActive !== false ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.passwordUpdatedAt
                            ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84]'
                            : 'bg-[rgba(246,179,82,0.12)] text-[#f6b352]'
                        }`}>
                          {u.passwordUpdatedAt ? 'set' : 'temporary'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-3">
                          <button onClick={() => setEditingUser(u)} className="text-[#5b8cff] hover:text-blue-400">Edit</button>
                          <button onClick={() => setResettingUser(u)} className="text-[#f6b352] hover:text-yellow-400">Reset Password</button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf}
                            className="text-[#ff6071] hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showModal || editingUser) && (
        <UserModal
          user={editingUser}
          roles={roles}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={(formData) => {
            if (editingUser) {
              handleUpdateUser(editingUser._id, formData);
            } else {
              handleCreateUser(formData);
            }
          }}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSave={(newPassword) => handleResetPassword(resettingUser._id, newPassword)}
        />
      )}

      {deletingUser && (
        <ConfirmationModal
          title="Delete User"
          description={`Are you sure you want to delete "${deletingUser.username}"? This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
}
