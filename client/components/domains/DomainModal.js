'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';
import useAuthStore from '../../stores/authStore';
import { getApiUrl } from '../../config/keys';

export default function DomainModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    defaultRecord: {
      type: 'A',
      value: '',
      ttl: 3600
    }
  });
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthStore();

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const validateIP = (ip, type) => {
    if (type === 'A') {
      // IPv4 validation
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipv4Regex.test(ip);
    } else if (type === 'AAAA') {
      // IPv6 validation
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      return ipv6Regex.test(ip);
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form validation
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Domain name is required';
    } else if (formData.name.toLowerCase().endsWith('.local')) {
      newErrors.name = 'Domains ending with .local are not allowed as they can cause resolution errors. Please use a different domain extension.';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/.test(formData.name)) {
      newErrors.name = 'Please enter a valid domain name';
    }

    if (!formData.defaultRecord.value.trim()) {
      newErrors.defaultRecord = 'Default IP address is required';
    } else if (!validateIP(formData.defaultRecord.value, formData.defaultRecord.type)) {
      newErrors.defaultRecord = `Please enter a valid ${formData.defaultRecord.type === 'A' ? 'IPv4' : 'IPv6'} address`;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Prepare API payload
      const payload = {
        type: formData.defaultRecord.type,
        DomainName: formData.name,
        IpAddress: formData.defaultRecord.value
      };

      setIsSubmitting(true);

      try {
        const authToken = token || localStorage.getItem('nexoral_auth_token');

        const response = await fetch(getApiUrl('CREATE_DOMAIN'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${authToken}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          // Success case
          onSave({
            ...formData,
            id: data.data?.id || Date.now().toString(),
            createdAt: new Date().toISOString()
          });
          onClose();
        } else {
          // Enhanced error handling
          if (response.status === 409) {
            // Check message to determine the specific conflict type
            if (data.message.toLowerCase().includes('ip address')) {
              setErrors({ defaultRecord: `IP address "${formData.defaultRecord.value}" is already in use by another domain` });
            } else {
              setErrors({ name: `Domain "${formData.name}" already exists` });
            }
          } else {
            setErrors({ api: data.message || 'Failed to create domain. Please try again.' });
          }
        }
      } catch (error) {
        setErrors({ api: 'Network error. Please check your connection and try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('defaultRecord.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        defaultRecord: { ...prev.defaultRecord, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));

      // Real-time validation for .local domain
      if (name === 'name' && value.toLowerCase().endsWith('.local')) {
        setErrors(prev => ({
          ...prev,
          [name]: 'Domains ending with .local are not allowed as they can cause resolution errors. Please use a different domain extension.'
        }));
        return;
      }
    }

    if (errors[name] || errors.defaultRecord) {
      setErrors(prev => ({ ...prev, [name]: '', defaultRecord: '' }));
    }
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
              <h2 className="text-lg font-semibold text-slate-800">Add New Domain</h2>
              <p className="text-sm text-slate-600 mt-1">Add a domain and configure its default DNS record</p>
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
          {/* Display API error if any */}
          {errors.api && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errors.api}</p>
                </div>
              </div>
            </div>
          )}

          {/* Replace InputField with direct input for better control of styling */}
          <div className="space-y-1">
            <label htmlFor="domain-name" className="block text-sm font-medium text-slate-700">
              Domain Name
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                </svg>
              </div>
              <input
                type="text"
                id="domain-name"
                name="name"
                placeholder="Enter domain name (e.g., example.com)"
                value={formData.name}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400"
                required
              />
            </div>
            {errors.name ? (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            ) : (
              <p className="text-slate-500 text-xs mt-1">
                <span className="flex items-center">
                  <svg className="h-3 w-3 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Note: Domain names ending with .local are not allowed as they can cause resolution errors.
                </span>
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Default DNS Record</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  name="defaultRecord.type"
                  value={formData.defaultRecord.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-slate-900"
                >
                  <option value="A">A (IPv4)</option>
                  <option value="AAAA">AAAA (IPv6)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">IP Address</label>
                <input
                  type="text"
                  name="defaultRecord.value"
                  placeholder={formData.defaultRecord.type === 'A' ? '192.168.1.1' : '2001:db8::1'}
                  value={formData.defaultRecord.value}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-slate-900 placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {errors.defaultRecord && (
              <p className="text-red-400 text-sm mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.defaultRecord}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Domain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
