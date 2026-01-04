'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import api from '../../services/api';

export default function DomainGroupsTab() {
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
      const response = await api.getDomainGroups({ skip: 0, limit: 100 });
      setGroups(response.data.data.groups || []);
    } catch (err) {
      console.error('Error fetching domain groups:', err);
      setError('Failed to load domain groups');
      toast.error('Failed to load domain groups');
    } finally {
      setLoading(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async (groupData) => {
    try {
      const response = await api.createDomainGroup({
        name: groupData.name,
        description: groupData.description || '',
        domains: groupData.domains
      });
      toast.success(response.data.data.message || 'Domain group created successfully');
      setShowModal(false);
      fetchGroups(); // Refresh the list
    } catch (err) {
      console.error('Error creating domain group:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to create domain group');
    }
  };

  // Handle update group
  const handleUpdateGroup = async (groupId, groupData) => {
    try {
      const response = await api.updateDomainGroup(groupId, {
        name: groupData.name,
        description: groupData.description || '',
        domains: groupData.domains
      });
      toast.success(response.data.data.message || 'Domain group updated successfully');
      setEditingGroup(null);
      fetchGroups(); // Refresh the list
    } catch (err) {
      console.error('Error updating domain group:', err);
      toast.error(err.response?.data?.data?.error || 'Failed to update domain group');
    }
  };

  // Handle delete group
  const handleDeleteGroup = async (groupId) => {
    const response = await api.deleteDomainGroup(groupId);
    toast.success(response.data.data.message || 'Domain group deleted successfully');
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
          <h3 className="text-lg font-semibold text-slate-800">Domain Groups</h3>
          <p className="text-sm text-slate-600 mt-1">Organize domains into groups for easier blocking</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Create Group
        </Button>
      </div>

      {/* Domain Groups Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading domain groups...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error loading domain groups</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchGroups}>Retry</Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No domain groups found</h3>
          <p className="text-slate-600 mb-4">Create your first domain group to organize domains</p>
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
                  <div className="text-3xl">📁</div>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                  </svg>
                  <span>{group.domains?.length || 0} domain{group.domains?.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Domain Preview */}
              <div className="bg-slate-50 rounded p-3 max-h-32 overflow-y-auto">
                <div className="text-xs text-slate-600 space-y-1">
                  {group.domains?.slice(0, 5).map((domainEntry, idx) => {
                    const domain = typeof domainEntry === 'string' ? domainEntry : domainEntry.domain;
                    const isWildcard = typeof domainEntry === 'string'
                      ? domainEntry.startsWith('*.') || domainEntry.endsWith('.*')
                      : domainEntry.isWildcard;

                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-mono">{domain}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 ${
                          isWildcard ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isWildcard ? '🌐' : '🎯'}
                        </span>
                      </div>
                    );
                  })}
                  {group.domains?.length > 5 && (
                    <div className="text-slate-500 italic">+ {group.domains.length - 5} more</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {(showModal || editingGroup) && (
        <DomainGroupModal
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

function DomainGroupModal({ group, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    icon: group?.icon || '📁',
    domains: group?.domains || []
  });
  const [newDomain, setNewDomain] = useState('');
  const [newDomainIsWildcard, setNewDomainIsWildcard] = useState(false);

  const icons = ['📱', '🎬', '🎮', '🔞', '📊', '💼', '🌐', '⚡', '🔥', '🛡️', '🔒', '📁'];

  const addDomain = () => {
    if (newDomain && !formData.domains.some(d => (typeof d === 'string' ? d : d.domain) === newDomain)) {
      setFormData({
        ...formData,
        domains: [...formData.domains, { domain: newDomain, isWildcard: newDomainIsWildcard }]
      });
      setNewDomain('');
      setNewDomainIsWildcard(false);
    }
  };

  const removeDomain = (domainToRemove) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter(d => (typeof d === 'string' ? d : d.domain) !== domainToRemove)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              {group ? 'Edit Domain Group' : 'Create Domain Group'}
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
              placeholder="e.g., Social Media"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-2xl p-2 rounded-lg transition-colors ${
                    formData.icon === icon
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Domains</label>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="e.g., facebook.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDomainIsWildcard}
                  onChange={(e) => setNewDomainIsWildcard(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span>
                  Include subdomains (wildcard)
                  <span className="text-slate-500 ml-1">
                    - e.g., blocks both "facebook.com" and "www.facebook.com"
                  </span>
                </span>
              </label>
              <button
                onClick={addDomain}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Domain
              </button>
            </div>
            {formData.domains.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                {formData.domains.map((domainEntry, idx) => {
                  const domain = typeof domainEntry === 'string' ? domainEntry : domainEntry.domain;
                  const isWildcard = typeof domainEntry === 'string'
                    ? domainEntry.startsWith('*.') || domainEntry.endsWith('.*')
                    : domainEntry.isWildcard;

                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                      <div className="flex-1">
                        <span className="text-sm font-mono font-medium text-slate-700">{domain}</span>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            isWildcard
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isWildcard ? '🌐 With Subdomains' : '🎯 Exact Match'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDomain(domain)}
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
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
            disabled={!formData.name || formData.domains.length === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              formData.name && formData.domains.length > 0
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
      console.error('Error deleting domain group:', err);
      const errorData = err.response?.data?.data;

      // Check if group is in use by policies
      if (errorData?.policiesCount && errorData?.policies) {
        setError(`Cannot delete this group because it is being used in ${errorData.policiesCount} access control policy(ies).`);
        setPoliciesInUse(errorData.policies);
      } else {
        setError(errorData?.error || 'Failed to delete domain group. Please try again.');
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
            Delete Domain Group
          </h3>
          <p className="text-slate-600 text-center mb-4">
            Are you sure you want to delete <span className="font-semibold">"{group.name}"</span>?
          </p>
          <p className="text-sm text-slate-500 text-center mb-4">
            This group contains {group.domains?.length || 0} domain{group.domains?.length !== 1 ? 's' : ''}.
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
