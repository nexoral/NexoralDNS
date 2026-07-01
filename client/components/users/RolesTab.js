'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import ConfirmationModal from '../ui/ConfirmationModal';
import RoleModal from './RoleModal';
import api from '../../services/api';

export default function RolesTab() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getRoles({ skip: 0, limit: 100 });
      setRoles(response.data.data.roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.getPermissions();
      setPermissions(response.data.data.permissions || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      toast.error('Failed to load permissions');
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleCreateRole = async (formData) => {
    try {
      const response = await api.createRole(formData);
      toast.success(response.data.data.message || 'Role created successfully');
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error('Error creating role:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (roleId, formData) => {
    try {
      await api.updateRole(roleId, formData);
      toast.success('Role updated successfully');
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async () => {
    try {
      setDeleteError(null);
      const response = await api.deleteRole(deletingRole._id);
      toast.success(response.data.data.message || 'Role deleted successfully');
      setDeletingRole(null);
      fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      const errorData = err.response?.data?.data;
      if (errorData?.assignedUserCount) {
        setDeleteError(`Cannot delete this role — it is assigned to ${errorData.assignedUserCount} user(s). Reassign them first.`);
      } else {
        toast.error(errorData?.error || 'Failed to delete role');
        setDeletingRole(null);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#e7eef6]">Roles</h3>
          <p className="text-sm text-[#9aa8bd] mt-1">Create roles by choosing from the available permissions</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Create Role
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-[#9aa8bd]">Loading roles...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-[rgba(255,96,113,0.07)] rounded-lg border-2 border-red-200">
          <p className="text-[#ff6071] mb-4">{error}</p>
          <Button onClick={fetchRoles}>Retry</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role._id}
              className="bg-[#0d111a] border border-[rgba(130,165,220,0.14)] rounded-lg p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-[#e7eef6]">{role.name}</h4>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingRole(role)}
                    className="p-1.5 text-[#5b8cff] hover:bg-[rgba(91,140,255,0.07)] rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setDeletingRole(role); setDeleteError(null); }}
                    className="p-1.5 text-[#ff6071] hover:bg-[rgba(255,96,113,0.07)] rounded transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-xs text-[#9aa8bd] mb-2">{role.permissions?.length || 0} permission(s)</div>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.slice(0, 4).map((p) => (
                  <span key={p._id} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(91,140,255,0.1)] text-[#5b8cff]">
                    {p.name}
                  </span>
                ))}
                {role.permissions?.length > 4 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/6 text-[#7c8aa0]">
                    +{role.permissions.length - 4} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showModal || editingRole) && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setShowModal(false);
            setEditingRole(null);
          }}
          onSave={(formData) => {
            if (editingRole) {
              handleUpdateRole(editingRole._id, formData);
            } else {
              handleCreateRole(formData);
            }
          }}
        />
      )}

      {deletingRole && (
        <ConfirmationModal
          title="Delete Role"
          description={`Are you sure you want to delete "${deletingRole.name}"?`}
          confirmText="Delete"
          variant="danger"
          onClose={() => setDeletingRole(null)}
          onConfirm={handleDeleteRole}
        >
          {deleteError && (
            <p className="text-sm text-[#ff6071] bg-[rgba(255,96,113,0.07)] border border-red-200 rounded-lg p-3">
              {deleteError}
            </p>
          )}
        </ConfirmationModal>
      )}
    </div>
  );
}
