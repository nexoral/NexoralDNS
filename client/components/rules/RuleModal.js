'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';

export default function RuleModal({ type, onClose, onSave }) {
  const [formData, setFormData] = useState({
    domain: '',
    target: '',
    ip: '',
    ttl: 3600,
    status: 'active'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const ruleData = { ...formData, type };
    onSave(ruleData);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getTitle = () => {
    const titles = {
      blocklist: 'Add Blocklist Rule',
      reroute: 'Add Reroute Rule',
      ttl: 'Add TTL Rule',
      custom: 'Add Custom Domain'
    };
    return titles[type] || 'Add Rule';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{getTitle()}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            type="text"
            name="domain"
            placeholder="Enter domain (e.g., example.com)"
            value={formData.domain}
            onChange={handleChange}
            required
          />

          {type === 'reroute' && (
            <InputField
              type="text"
              name="target"
              placeholder="Target domain (e.g., newsite.com)"
              value={formData.target}
              onChange={handleChange}
              required
            />
          )}

          {type === 'custom' && (
            <InputField
              type="text"
              name="ip"
              placeholder="IP Address (e.g., 192.168.1.1)"
              value={formData.ip}
              onChange={handleChange}
              required
            />
          )}

          {type === 'ttl' && (
            <InputField
              type="number"
              name="ttl"
              placeholder="TTL in seconds"
              value={formData.ttl}
              onChange={handleChange}
              required
            />
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
