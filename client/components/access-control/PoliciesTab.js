'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import CreatePolicyModal from './CreatePolicyModal';

export default function PoliciesTab() {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  // Mock data - replace with API
  const policies = [
    {
      id: 1,
      name: 'Block Social Media for Guest WiFi',
      type: 'user_domain',
      target: '192.168.1.0/24',
      blockScope: 'Social Media Group',
      isActive: true
    },
    {
      id: 2,
      name: 'Full Internet Block - Parental Control',
      type: 'user_internet',
      target: '192.168.1.150',
      blockScope: 'Full Internet',
      isActive: true
    },
    {
      id: 3,
      name: 'Block Adult Content for All Users',
      type: 'domain_all',
      target: 'All Users',
      blockScope: 'Adult Content Group',
      isActive: true
    },
    {
      id: 4,
      name: 'Gaming Sites - Office Hours',
      type: 'group_based',
      target: 'Office Devices',
      blockScope: 'Gaming Group',
      isActive: false
    }
  ];

  const getTypeBadge = (type) => {
    const badges = {
      user_domain: { label: 'User → Domain', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      user_internet: { label: 'User → Internet', color: 'bg-red-100 text-red-700 border-red-300' },
      domain_all: { label: 'Domain → All', color: 'bg-purple-100 text-purple-700 border-purple-300' },
      domain_user: { label: 'Domain → User', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      group_based: { label: 'Advanced', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' }
    };
    return badges[type] || badges.user_domain;
  };

  const filteredPolicies = policies.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return p.isActive;
    if (filter === 'inactive') return !p.isActive;
    return p.type === filter;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Blocking Policies</h3>
          <p className="text-sm text-slate-600 mt-1">Create and manage access control policies</p>
        </div>
        <Button onClick={() => setShowModal(true)} variant="primary">
          Create Policy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Policies
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'inactive'
              ? 'bg-slate-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Inactive
        </button>
        <div className="border-l border-slate-300 h-6 mx-2"></div>
        <button
          onClick={() => setFilter('user_domain')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'user_domain'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          User → Domain
        </button>
        <button
          onClick={() => setFilter('user_internet')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            filter === 'user_internet'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          User → Internet
        </button>
      </div>

      {/* Policies List */}
      {filteredPolicies.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <div className="text-6xl mb-4">🛡️</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No policies found</h3>
          <p className="text-slate-600 mb-4">Create your first blocking policy to get started</p>
          <Button onClick={() => setShowModal(true)}>Create Policy</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPolicies.map((policy) => {
            const badge = getTypeBadge(policy.type);
            return (
              <div
                key={policy.id}
                className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-base font-semibold text-slate-800">{policy.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-600">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span><strong>Target:</strong> {policy.target}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span><strong>Blocks:</strong> {policy.blockScope}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={policy.isActive} onChange={() => {}} />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>

                    {/* Edit Button */}
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Policy Modal */}
      {showModal && (
        <CreatePolicyModal
          onClose={() => setShowModal(false)}
          onSave={(policy) => {
            console.log('New policy:', policy);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
