'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';

export default function RecordModal({ domain, onClose }) {
  const [activeTab, setActiveTab] = useState('records');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: 'A',
    name: '',
    value: '',
    ttl: 3600
  });

  // Dummy DNS records data
  const [records, setRecords] = useState([
    { id: 1, type: 'A', name: '@', value: '192.168.1.1', ttl: 3600, status: 'active' },
    { id: 2, type: 'CNAME', name: 'www', value: domain.name, ttl: 3600, status: 'active' },
    { id: 3, type: 'MX', name: '@', value: '10 mail.example.com', ttl: 3600, status: 'active' },
    { id: 4, type: 'TXT', name: '@', value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600, status: 'active' }
  ]);

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'];

  const handleAddRecord = (e) => {
    e.preventDefault();
    const recordWithId = { ...newRecord, id: Date.now(), status: 'active' };
    setRecords(prev => [...prev, recordWithId]);
    setNewRecord({ type: 'A', name: '', value: '', ttl: 3600 });
    setShowAddRecord(false);
  };

  const handleDeleteRecord = (id) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      'A': 'bg-blue-100 text-blue-800',
      'AAAA': 'bg-purple-100 text-purple-800',
      'CNAME': 'bg-green-100 text-green-800',
      'MX': 'bg-yellow-100 text-yellow-800',
      'TXT': 'bg-red-100 text-red-800',
      'NS': 'bg-indigo-100 text-indigo-800',
      'PTR': 'bg-pink-100 text-pink-800',
      'SRV': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Manage DNS Records</h2>
              <p className="text-sm text-slate-600 mt-1">Domain: {domain.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'records', label: 'DNS Records' },
                { id: 'settings', label: 'Domain Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'records' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">DNS Records</h3>
                  <Button
                    onClick={() => setShowAddRecord(true)}
                    variant="primary"
                    size="sm"
                  >
                    Add Record
                  </Button>
                </div>

                {/* Add Record Form */}
                {showAddRecord && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <select
                        value={newRecord.type}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, type: e.target.value }))}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {recordTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Name"
                        value={newRecord.name}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />

                      <input
                        type="text"
                        placeholder="Value"
                        value={newRecord.value}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, value: e.target.value }))}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />

                      <input
                        type="number"
                        placeholder="TTL"
                        value={newRecord.ttl}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, ttl: parseInt(e.target.value) }))}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />

                      <div className="flex space-x-2">
                        <Button type="submit" variant="primary" size="sm">
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowAddRecord(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Records Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">TTL</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecordTypeColor(record.type)}`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">{record.name || '@'}</td>
                          <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">{record.value}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{record.ttl}</td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
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
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Domain Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">DNSSEC</h4>
                      <p className="text-sm text-slate-600 mb-3">Enable DNSSEC for enhanced security</p>
                      <Button variant="secondary" size="sm">
                        Configure DNSSEC
                      </Button>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">Zone Transfer</h4>
                      <p className="text-sm text-slate-600 mb-3">Manage zone transfer settings</p>
                      <Button variant="secondary" size="sm">
                        Configure Transfer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
