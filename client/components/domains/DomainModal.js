'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';

export default function DomainModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Domain name is required';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/.test(formData.name)) {
      newErrors.name = 'Please enter a valid domain name';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(formData);
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Add New Domain</h2>
          <p className="text-sm text-slate-600 mt-1">Add a domain to manage its DNS records</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            type="text"
            name="name"
            placeholder="Enter domain name (e.g., example.com)"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            }
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Domain
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
