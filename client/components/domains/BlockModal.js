'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import { isLocalNetwork } from '../../services/networkDetection';

export default function BlockModal({ domain, onClose, onSave }) {
  const [blockSettings, setBlockSettings] = useState({
    blockType: 'all',
    specificIPs: [],
    reason: ''
  });
  const [mounted, setMounted] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  // Fix hydration issues and detect network
  useEffect(() => {
    setMounted(true);
    setIsLocal(isLocalNetwork());
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d111a] rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-[rgba(130,165,220,0.14)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#e7eef6]">Block Domain</h2>
              <p className="text-sm text-[#9aa8bd] mt-1">Configure blocking settings for {domain.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#5f6b7d] hover:text-[#9aa8bd] transition-colors rounded-lg hover:bg-white/8"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Network Detection Notice */}
          {!isLocal && (
            <div className="bg-[rgba(91,140,255,0.07)] border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-[#5b8cff] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#5b8cff]">Cloud/Public Network Detected</p>
                  <p className="text-sm text-[#5b8cff]">
                    You're accessing from a cloud/public network. Block type is set to "all clients" and cannot be changed.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#cdd9e8] mb-2">Block Type</label>
            <select
              name="blockType"
              value={blockSettings.blockType}
              onChange={handleChange}
              disabled={!isLocal}
              className={`w-full px-3 py-2 border border-[rgba(130,165,220,0.2)] rounded-lg focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-transparent bg-[#0d111a] text-[#e7eef6] ${
                !isLocal ? 'opacity-50 cursor-not-allowed bg-white/8' : ''
              }`}
            >
              <option value="all">Block for all clients</option>
              {isLocal && <option value="specific">Block for specific IPs only</option>}
            </select>
            {!isLocal && (
              <p className="text-xs text-[#7c8aa0] mt-1">
                ⚠️ IP-specific blocking is only available on local networks
              </p>
            )}
          </div>

          {blockSettings.blockType === 'specific' && isLocal && (
            <div>
              <label className="block text-sm font-medium text-[#cdd9e8] mb-2">Specific IP Addresses</label>
              <TagInput
                value={blockSettings.specificIPs}
                onChange={handleIPsChange}
                placeholder="Enter IP addresses (192.168.1.100, 10.0.0.1, ...)"
              />
              <p className="text-xs text-[#7c8aa0] mt-1">
                Enter local network IP addresses to block this domain for specific clients only
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#cdd9e8] mb-2">Reason for Blocking (Optional)</label>
            <input
              type="text"
              name="reason"
              placeholder="Enter reason for blocking"
              value={blockSettings.reason}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[rgba(130,165,220,0.2)] rounded-lg focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-transparent bg-[#0d111a] text-[#e7eef6] placeholder-[#5f6b7d]"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Warning</p>
                <p className="text-sm text-[#f6b352]">
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
