'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { config, getApiUrl } from '../../config/keys';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function RecordModal({ domain, onClose }) {
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [newRecord, setNewRecord] = useState({
    type: 'A',
    name: '',
    value: '',
    ttl: 3600
  });
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fix hydration issues and fetch DNS records
  useEffect(() => {
    setMounted(true);
  }, []);

  // Separate useEffect to fetch records after mounting
  useEffect(() => {
    if (mounted) {
      fetchDnsRecords();
    }
  }, [mounted, domain.name]);

  // State for DNS records
  const [records, setRecords] = useState([]);

  // Fetch DNS records from API
  const fetchDnsRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('nexoral_auth_token');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      // Construct the URL for fetching DNS records
      const baseUrl = config.API_BASE_URL;
      const dnsListUrl = `${baseUrl}${config.API_ENDPOINTS.DNS_LIST}/${domain.name}`;

      const response = await fetch(dnsListUrl, {
        method: 'GET',
        headers: {
          'Authorization': `${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch DNS records');
      }

      const result = await response.json();

      if (result.statusCode === 200 && result.data && result.data.DNS_List) {
        // Transform API response to match expected format
        const transformedRecords = result.data.DNS_List.map(record => ({
          id: record._id,
          type: record.type,
          name: record.name || '@',
          value: record.value,
          ttl: record.ttl,
          status: 'active', // Assuming all returned records are active
          _original: record // Keep original data for API operations
        }));

        setRecords(transformedRecords);
      } else {
        // If no records or unexpected response structure
        setRecords([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching DNS records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const recordTypes = ['A', 'AAAA', 'CNAME'];

  const validateRecord = (record = null) => {
    const errors = {};
    const recordToValidate = record || editingRecord || newRecord;

    if (!recordToValidate.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!recordToValidate.value.trim()) {
      errors.value = 'Value is required';
    } else {
      if (recordToValidate.type === 'A') {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipv4Regex.test(recordToValidate.value)) {
          errors.value = 'Please enter a valid IPv4 address';
        }
      } else if (recordToValidate.type === 'AAAA') {
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
        if (!ipv6Regex.test(recordToValidate.value)) {
          errors.value = 'Please enter a valid IPv6 address';
        }
      }
    }

    return errors;
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    const errors = validateRecord();

    if (Object.keys(errors).length === 0) {
      // Start loading
      setIsLoading(true);
      setError(null);

      try {
        const authToken = localStorage.getItem('nexoral_auth_token');
        if (!authToken) {
          throw new Error('Authentication token not found');
        }

        // Process the record name and value
        // If name is '@', use the domain name itself
        const name = newRecord.name.trim() === '@' ? '' : newRecord.name.trim();

        // If value is '@', use the domain name
        const value = newRecord.value.trim() === '@' ? domain.name : newRecord.value.trim();

        // Prepare API request payload
        const payload = {
          DomainName: domain.name,
          name: name,
          type: newRecord.type,
          value: value,
          ttl: parseInt(newRecord.ttl)
        };

        // Make API request to create DNS record
        const response = await fetch(getApiUrl('CREATE_DNS'), {
          method: 'POST',
          headers: {
            'Authorization': `${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Handle specific error responses
        if (!response.ok) {
          const errorData = await response.json();

          // Handle 409 Conflict - Value already in use
          if (response.status === 409) {
            // Create a more specific error message based on record type
            let conflictMessage;
            switch (newRecord.type) {
              case 'A':
                conflictMessage = `IP address '${value}' is already in use by another domain`;
                break;
              case 'AAAA':
                conflictMessage = `IPv6 address '${value}' is already in use by another domain`;
                break;
              case 'CNAME':
                conflictMessage = `Target '${value}' is already referenced by another domain`;
                break;
              default:
                conflictMessage = `Value '${value}' is already in use by another domain`;
            }

            setError(`Conflict Error: ${conflictMessage}. Please use a different value.`);
            setIsLoading(false);
            return;
          }

          throw new Error(errorData.message || 'Failed to create DNS record');
        }

        // Reset form
        setNewRecord({ type: 'A', name: '', value: '', ttl: 3600 });
        setShowAddRecord(false);

        // Refresh records from API to get updated list with server-generated IDs
        fetchDnsRecords();

      } catch (err) {
        setError(`Failed to create record: ${err.message}`);
        console.error('Error creating DNS record:', err);
        setIsLoading(false);
      }
    } else {
      alert(Object.values(errors).join('\n'));
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord({
      ...record,
      name: record.name || '',
      value: record.value,
      type: record.type,
      ttl: record.ttl
    });
    setShowAddRecord(false);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    const errors = validateRecord();

    if (Object.keys(errors).length === 0 && editingRecord) {
      setIsLoading(true);
      setError(null);

      try {
        const authToken = localStorage.getItem('nexoral_auth_token');
        if (!authToken) {
          throw new Error('Authentication token not found');
        }

        // Prepare API request payload according to schema
        const payload = {
          name: editingRecord.name.trim() === '@' ? '' : editingRecord.name.trim(),
          type: editingRecord.type,
          value: editingRecord.value.trim() === '@' ? domain.name : editingRecord.value.trim(),
          ttl: parseInt(editingRecord.ttl)
        };

        // Make API request to update DNS record
        const updateUrl = `${config.API_BASE_URL}${config.API_ENDPOINTS.UPDATE_DNS}/${editingRecord.id}`;

        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // Handle specific error responses
        if (!response.ok) {
          const errorData = await response.json();

          // Handle 409 Conflict
          if (response.status === 409) {
            if (errorData.message.toLowerCase().includes('name')) {
              setError(`Name '${payload.name || '@'}' is already in use by another record`);
            } else if (errorData.message.toLowerCase().includes('value')) {
              setError(`Value '${payload.value}' is already in use by another record`);
            } else {
              setError(`Conflict: ${errorData.message}`);
            }
            setIsLoading(false);
            return;
          }

          // Handle 404 Not Found
          if (response.status === 404) {
            setError('DNS record not found. It may have been deleted.');
            setIsLoading(false);
            return;
          }

          throw new Error(errorData.message || 'Failed to update DNS record');
        }

        // Reset editing state
        setEditingRecord(null);

        // Refresh records from API to get updated list
        await fetchDnsRecords();

      } catch (err) {
        setError(`Failed to update record: ${err.message}`);
        console.error('Error updating DNS record:', err);
        setIsLoading(false);
      }
    } else {
      alert(Object.values(errors).join('\n'));
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      'A': 'bg-blue-100 text-blue-800',
      'AAAA': 'bg-purple-100 text-purple-800',
      'CNAME': 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPlaceholder = (type) => {
    switch (type) {
      case 'A': return '192.168.1.1';
      case 'AAAA': return '2001:db8::1';
      case 'CNAME': return 'target.example.com';
      default: return '';
    }
  };

  if (!mounted) {
    return null; // Prevent hydration issues
  }

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
              onClick={() => {
                // Give final API requests a chance to complete before closing
                setTimeout(() => {
                  onClose();
                }, 100);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">DNS Records (A, AAAA, CNAME only)</h3>
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
                  onChange={(e) => setNewRecord(prev => ({ ...prev, type: e.target.value, value: '' }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {recordTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Name (@ for root)"
                  value={newRecord.name}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  placeholder={getPlaceholder(newRecord.type)}
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
                  min="60"
                  max="86400"
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

          {/* Edit Record Form */}
          {editingRecord && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border-2 border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">Edit DNS Record</h4>
              <form onSubmit={handleUpdateRecord} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select
                  value={editingRecord.type}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, type: e.target.value, value: '' }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {recordTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Name (@ for root)"
                  value={editingRecord.name}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  placeholder={getPlaceholder(editingRecord.type)}
                  value={editingRecord.value}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, value: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="number"
                  placeholder="TTL"
                  value={editingRecord.ttl}
                  onChange={(e) => setEditingRecord(prev => ({ ...prev, ttl: parseInt(e.target.value) }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="60"
                  max="86400"
                  required
                />

                <div className="flex space-x-2">
                  <Button type="submit" variant="primary" size="sm">
                    Update
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-10 text-center">
              <LoadingSpinner />
              <p className="mt-2 text-slate-600">Loading DNS records...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="mb-6">
              <div className={`${error.includes('Conflict Error') ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-md`}>
                <div className="flex">
                  <div className={`flex-shrink-0 ${error.includes('Conflict Error') ? 'text-orange-400' : 'text-red-400'}`}>
                    {error.includes('Conflict Error') ? (
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.485 2.495c.873-1.512 3.057-1.512 3.93 0l6.28 10.875c.87 1.509-.217 3.378-1.967 3.378H4.172c-1.75 0-2.836-1.869-1.966-3.378l6.28-10.875zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${error.includes('Conflict Error') ? 'text-orange-700' : 'text-red-700'}`}>{error}</p>
                    <button
                      onClick={fetchDnsRecords}
                      className={`mt-2 text-sm font-medium underline ${error.includes('Conflict Error') ? 'text-orange-700' : 'text-red-700'}`}
                    >
                      {error.includes('Conflict Error') ? 'Refresh records' : 'Try again'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Records Table */}
          {!isLoading && !error && (
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
                  {records.length > 0 ? (
                    records.map((record) => (
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
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                        No DNS records found for this domain. Add your first record to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer with Done button */}
          <div className="mt-6 border-t border-slate-200 pt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                // Give final API requests a chance to complete before closing
                setTimeout(() => {
                  onClose();
                }, 100);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}