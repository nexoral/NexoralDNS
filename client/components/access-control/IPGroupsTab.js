'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import api from '../../services/api';

export default function IPGroupsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getIPGroups({ skip: 0, limit: 100 });
      setGroups(response.data.data.groups || []);
    } catch (err) {
      console.error('Error fetching IP groups:', err);
      setError('Failed to load IP groups');
      toast.error('Failed to load IP groups');
    } finally {
      setLoading(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async (groupData) => {
    try {
      const response = await api.createIPGroup({
        name: groupData.name,
        description: groupData.description || '',
        ipAddresses: groupData.ipAddresses
      });
      toast.success(response.data.data.message || 'IP group created successfully');
      setShowModal(false);
      fetchGroups(); // Refresh the list
    } catch (err) {
      console.error('Error creating IP group:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to create IP group');
    }
  };

  // Handle update group
  const handleUpdateGroup = async (groupId, groupData) => {
    try {
      const response = await api.updateIPGroup(groupId, {
        name: groupData.name,
        description: groupData.description || '',
        ipAddresses: groupData.ipAddresses
      });
      toast.success(response.data.data.message || 'IP group updated successfully');
      setEditingGroup(null);
      fetchGroups(); // Refresh the list
    } catch (err) {
      console.error('Error updating IP group:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to update IP group');
    }
  };

  // Handle delete group
  const handleDeleteGroup = async (groupId) => {
    const response = await api.deleteIPGroup(groupId);
    toast.success(response.data.data.message || 'IP group deleted successfully');
    setDeletingGroup(null);
    fetchGroups(); // Refresh the list
  };

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">IP Groups</h3>
          <p className="text-sm text-slate-600 mt-1">Organize IP addresses into groups for easier management</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Create Group
        </Button>
      </div>

      {/* IP Groups Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading IP groups...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error loading IP groups</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchGroups}>Retry</Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No IP groups found</h3>
          <p className="text-slate-600 mb-4">Create your first IP group to organize IP addresses</p>
          <Button onClick={() => setShowModal(true)}>Create Group</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group._id}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">👥</div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{group.name}</h4>
                    {group.description && (
                      <p className="text-xs text-slate-500">{group.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeletingGroup(group)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center text-sm text-slate-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{group.ipAddresses?.length || 0} IP range{group.ipAddresses?.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* IP Preview */}
              <div className="bg-slate-50 rounded p-3 max-h-32 overflow-y-auto">
                <div className="text-xs text-slate-600 space-y-1">
                  {group.ipAddresses?.slice(0, 5).map((ip, idx) => (
                    <div key={idx} className="font-mono">{ip}</div>
                  ))}
                  {group.ipAddresses?.length > 5 && (
                    <div className="text-slate-500 italic">+ {group.ipAddresses.length - 5} more</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {(showModal || editingGroup) && (
        <IPGroupModal
          group={editingGroup}
          onClose={() => {
            setShowModal(false);
            setEditingGroup(null);
          }}
          onSave={(groupData) => {
            if (editingGroup) {
              handleUpdateGroup(editingGroup._id, groupData);
            } else {
              handleCreateGroup(groupData);
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingGroup && (
        <DeleteConfirmModal
          group={deletingGroup}
          onClose={() => setDeletingGroup(null)}
          onConfirm={() => handleDeleteGroup(deletingGroup._id)}
        />
      )}
    </div>
  );
}

function IPGroupModal({ group, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    ipAddresses: group?.ipAddresses || []
  });
  const [newIP, setNewIP] = useState('');

  const addIP = () => {
    if (newIP && !formData.ipAddresses.includes(newIP)) {
      setFormData({ ...formData, ipAddresses: [...formData.ipAddresses, newIP] });
      setNewIP('');
    }
  };

  const removeIP = (ip) => {
    setFormData({ ...formData, ipAddresses: formData.ipAddresses.filter(i => i !== ip) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {group ? 'Edit IP Group' : 'Create IP Group'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Group Name</label>
            <input
              type="text"
              placeholder="e.g., Guest WiFi Devices"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Devices connected to guest network"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              IP Addresses / CIDR Ranges
            </label>
            <p className="text-xs text-slate-500 mb-2">
              You can add single IPs (192.168.1.100) or CIDR ranges (192.168.1.0/24)
            </p>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                placeholder="e.g., 192.168.1.100 or 192.168.1.0/24"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIP()}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addIP}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {formData.ipAddresses.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                {formData.ipAddresses.map((ip, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <span className="text-sm font-mono text-slate-700">{ip}</span>
                    <button
                      onClick={() => removeIP(ip)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || formData.ipAddresses.length === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              formData.name && formData.ipAddresses.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {group ? 'Update Group' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ group, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [policiesInUse, setPoliciesInUse] = useState([]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      setPoliciesInUse([]);
      await onConfirm();
    } catch (err) {
      console.error('Error deleting IP group:', err);
      const errorData = err.response?.data?.data;

      // Check if group is in use by policies
      if (errorData?.policiesCount && errorData?.policies) {
        setError(`Cannot delete this group because it is being used in ${errorData.policiesCount} access control policy(ies).`);
        setPoliciesInUse(errorData.policies);
      } else {
        setError(errorData?.error || 'Failed to delete IP group. Please try again.');
      }

      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 text-center mb-2">
            Delete IP Group
          </h3>
          <p className="text-slate-600 text-center mb-4">
            Are you sure you want to delete <span className="font-semibold">"{group.name}"</span>?
          </p>
          <p className="text-sm text-slate-500 text-center mb-4">
            This group contains {group.ipAddresses?.length || 0} IP address{group.ipAddresses?.length !== 1 ? 'es' : ''}.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">{error}</p>
              {policiesInUse.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-red-700 font-semibold mb-2">Policies using this group:</p>
                  <ul className="space-y-1">
                    {policiesInUse.map((policy) => (
                      <li key={policy.id} className="text-xs text-red-700 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {policy.name}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-3 italic">Please remove this group from these policies before deleting.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
