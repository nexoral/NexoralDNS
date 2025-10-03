'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';

export default function BlockModal({ domain, onClose, onSave }) {
  const [blockSettings, setBlockSettings] = useState({
    blockType: 'all',
    specificIPs: [],
    reason: ''
  });
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ domain: domain.name, ...blockSettings });
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBlockSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleIPsChange = (ips) => {
    setBlockSettings(prev => ({ ...prev, specificIPs: ips }));
  };

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Block Domain</h2>
              <p className="text-sm text-slate-600 mt-1">Configure blocking settings for {domain.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Block Type</label>
            <select
              name="blockType"
              value={blockSettings.blockType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
            >
              <option value="all">Block for all clients</option>
              <option value="specific">Block for specific IPs only</option>
            </select>
          </div>

          {blockSettings.blockType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Specific IP Addresses</label>
              <TagInput
                value={blockSettings.specificIPs}
                onChange={handleIPsChange}
                placeholder="Enter IP addresses (192.168.1.100, 10.0.0.1, ...)"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Blocking (Optional)</label>
            <input
              type="text"
              name="reason"
              placeholder="Enter reason for blocking"
              value={blockSettings.reason}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-500"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Warning</p>
                <p className="text-sm text-yellow-700">
                  Blocking this domain will prevent DNS resolution for the selected clients.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={blockSettings.blockType === 'specific' && blockSettings.specificIPs.length === 0}
            >
              Block Domain
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
