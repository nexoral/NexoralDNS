'use client';

import { useState } from 'react';
import Button from '../ui/Button';

export default function DomainGroupsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // Mock data - replace with API
  const groups = [
    {
      id: 'social',
      name: 'Social Media',
      icon: '📱',
      domains: ['facebook.com', '*.facebook.com', 'instagram.com', '*.instagram.com', 'twitter.com', 'tiktok.com'],
      usedInPolicies: 3,
      isDefault: true
    },
    {
      id: 'streaming',
      name: 'Streaming Sites',
      icon: '🎬',
      domains: ['netflix.com', 'youtube.com', 'hulu.com', 'disneyplus.com', 'primevideo.com'],
      usedInPolicies: 1,
      isDefault: true
    },
    {
      id: 'gaming',
      name: 'Gaming',
      icon: '🎮',
      domains: ['steam.com', 'epicgames.com', 'twitch.tv', 'roblox.com'],
      usedInPolicies: 2,
      isDefault: true
    },
    {
      id: 'adult',
      name: 'Adult Content',
      icon: '🔞',
      domains: ['*.adult.com', '*.xxx', '*.porn'],
      usedInPolicies: 5,
      isDefault: true
    },
    {
      id: 'ads',
      name: 'Ads & Trackers',
      icon: '📊',
      domains: ['*.doubleclick.net', '*.googlesyndication.com', '*.ads.com'],
      usedInPolicies: 0,
      isDefault: true
    },
    {
      id: 'custom1',
      name: 'Work Distractions',
      icon: '💼',
      domains: ['reddit.com', 'news.ycombinator.com', 'medium.com'],
      usedInPolicies: 1,
      isDefault: false
    }
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{group.icon}</div>
                <div>
                  <h4 className="font-semibold text-slate-800">{group.name}</h4>
                  {group.isDefault && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Default</span>
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
                {!group.isDefault && (
                  <button
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center text-sm text-slate-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                </svg>
                <span>{group.domains.length} domain{group.domains.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Used in {group.usedInPolicies} {group.usedInPolicies === 1 ? 'policy' : 'policies'}</span>
              </div>
            </div>

            {/* Domain Preview */}
            <div className="bg-slate-50 rounded p-3 max-h-32 overflow-y-auto">
              <div className="text-xs text-slate-600 space-y-1">
                {group.domains.slice(0, 5).map((domain, idx) => (
                  <div key={idx} className="font-mono">{domain}</div>
                ))}
                {group.domains.length > 5 && (
                  <div className="text-slate-500 italic">+ {group.domains.length - 5} more</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Group Modal */}
      {(showModal || editingGroup) && (
        <DomainGroupModal
          group={editingGroup}
          onClose={() => {
            setShowModal(false);
            setEditingGroup(null);
          }}
          onSave={(group) => {
            console.log('Save group:', group);
            setShowModal(false);
            setEditingGroup(null);
          }}
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

  const icons = ['📱', '🎬', '🎮', '🔞', '📊', '💼', '🌐', '⚡', '🔥', '🛡️', '🔒', '📁'];

  const addDomain = () => {
    if (newDomain && !formData.domains.includes(newDomain)) {
      setFormData({ ...formData, domains: [...formData.domains, newDomain] });
      setNewDomain('');
    }
  };

  const removeDomain = (domain) => {
    setFormData({ ...formData, domains: formData.domains.filter(d => d !== domain) });
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
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                placeholder="e.g., facebook.com or *.instagram.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addDomain}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {formData.domains.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                {formData.domains.map((domain, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <span className="text-sm font-mono text-slate-700">{domain}</span>
                    <button
                      onClick={() => removeDomain(domain)}
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
