'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CreatePolicyModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    targetType: '',
    targetIP: '',
    targetIPs: [],
    targetIPGroup: '',
    targetIPGroups: [],
    blockType: '',
    domains: [],
    domainGroup: '',
    domainGroups: [],
    policyName: '',
    policyType: 'group_based', // Always use group_based for flexible policies
    isActive: true
  });

  // Temporary input fields
  const [newIP, setNewIP] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newDomainIsWildcard, setNewDomainIsWildcard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ipGroups, setIpGroups] = useState([]);
  const [domainGroups, setDomainGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch IP Groups and Domain Groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const [ipGroupsResponse, domainGroupsResponse] = await Promise.all([
          api.getIPGroups(),
          api.getDomainGroups()
        ]);
        setIpGroups(ipGroupsResponse.data.data.groups || []);
        setDomainGroups(domainGroupsResponse.data.data.groups || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  const addIP = () => {
    if (newIP && !formData.targetIPs.includes(newIP)) {
      setFormData({ ...formData, targetIPs: [...formData.targetIPs, newIP] });
      setNewIP('');
    }
  };

  const removeIP = (ip) => {
    setFormData({ ...formData, targetIPs: formData.targetIPs.filter(i => i !== ip) });
  };

  const addDomain = () => {
    if (newDomain && !formData.domains.some(d => d.domain === newDomain)) {
      setFormData({
        ...formData,
        domains: [...formData.domains, { domain: newDomain, isWildcard: newDomainIsWildcard }]
      });
      setNewDomain('');
      setNewDomainIsWildcard(false);
    }
  };

  const removeDomain = (domainToRemove) => {
    setFormData({ ...formData, domains: formData.domains.filter(d => d.domain !== domainToRemove) });
  };

  const toggleIPGroup = (groupId) => {
    const isSelected = formData.targetIPGroups.includes(groupId);
    if (isSelected) {
      setFormData({ ...formData, targetIPGroups: formData.targetIPGroups.filter(id => id !== groupId) });
    } else {
      setFormData({ ...formData, targetIPGroups: [...formData.targetIPGroups, groupId] });
    }
  };

  const toggleDomainGroup = (groupId) => {
    const isSelected = formData.domainGroups.includes(groupId);
    if (isSelected) {
      setFormData({ ...formData, domainGroups: formData.domainGroups.filter(id => id !== groupId) });
    } else {
      setFormData({ ...formData, domainGroups: [...formData.domainGroups, groupId] });
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build the submission data based on what user selected
      const submitData = {
        policyType: formData.policyType,
        policyName: formData.policyName,
        isActive: formData.isActive,
        targetType: formData.targetType,
        blockType: formData.blockType
      };

      // Add target fields based on targetType
      if (formData.targetType === 'single_ip') {
        submitData.targetIP = formData.targetIP;
      } else if (formData.targetType === 'multiple_ips') {
        submitData.targetIPs = formData.targetIPs;
      } else if (formData.targetType === 'ip_group') {
        submitData.targetIPGroup = formData.targetIPGroup;
      } else if (formData.targetType === 'multiple_ip_groups') {
        submitData.targetIPGroups = formData.targetIPGroups;
      }

      // Add block fields based on blockType
      if (formData.blockType === 'specific_domains') {
        submitData.domains = formData.domains;
      } else if (formData.blockType === 'domain_group') {
        submitData.domainGroup = formData.domainGroup;
      } else if (formData.blockType === 'multiple_domain_groups') {
        submitData.domainGroups = formData.domainGroups;
      }

      await onSave(submitData);
    } catch (error) {
      console.error('Error in modal:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: // WHO
        return formData.targetType !== '' && (
          formData.targetType === 'all' ||
          (formData.targetType === 'single_ip' && formData.targetIP !== '') ||
          (formData.targetType === 'multiple_ips' && formData.targetIPs.length > 0) ||
          (formData.targetType === 'ip_group' && formData.targetIPGroup !== '') ||
          (formData.targetType === 'multiple_ip_groups' && formData.targetIPGroups.length > 0)
        );
      case 2: // WHAT
        return formData.blockType !== '' && (
          formData.blockType === 'full_internet' ||
          (formData.blockType === 'specific_domains' && formData.domains.length > 0) ||
          (formData.blockType === 'domain_group' && formData.domainGroup !== '') ||
          (formData.blockType === 'multiple_domain_groups' && formData.domainGroups.length > 0)
        );
      case 3: // DETAILS
        return formData.policyName !== '';
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Create Access Control Policy</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-slate-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>Who to Block</span>
            <span>What to Block</span>
            <span>Details</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[450px]">
          {/* Step 1: WHO should be blocked? */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">WHO should be blocked?</h3>
              <p className="text-sm text-slate-600 mb-4">Select which users or devices this policy applies to</p>

              <div className="space-y-4">
                {/* Single IP */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.targetType === 'single_ip' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetType"
                      value="single_ip"
                      checked={formData.targetType === 'single_ip'}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Single IP Address</span>
                      <p className="text-sm text-slate-600">Block a specific device by IP</p>
                    </div>
                  </div>
                  {formData.targetType === 'single_ip' && (
                    <input
                      type="text"
                      placeholder="e.g., 192.168.1.100"
                      value={formData.targetIP}
                      onChange={(e) => setFormData({ ...formData, targetIP: e.target.value })}
                      className="w-full mt-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </label>

                {/* Multiple IPs */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.targetType === 'multiple_ips' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetType"
                      value="multiple_ips"
                      checked={formData.targetType === 'multiple_ips'}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Multiple IP Addresses</span>
                      <p className="text-sm text-slate-600">Block several specific devices</p>
                    </div>
                  </div>
                  {formData.targetType === 'multiple_ips' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="e.g., 192.168.1.100"
                          value={newIP}
                          onChange={(e) => setNewIP(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addIP()}
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={addIP}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {formData.targetIPs.length > 0 && (
                        <div className="space-y-2">
                          {formData.targetIPs.map((ip, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                              <span className="text-sm text-slate-700">{ip}</span>
                              <button onClick={() => removeIP(ip)} className="text-red-600 hover:text-red-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </label>

                {/* Single IP Group */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.targetType === 'ip_group' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetType"
                      value="ip_group"
                      checked={formData.targetType === 'ip_group'}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">IP Group</span>
                      <p className="text-sm text-slate-600">Block a pre-defined group of devices</p>
                    </div>
                  </div>
                  {formData.targetType === 'ip_group' && (
                    <select
                      value={formData.targetIPGroup}
                      onChange={(e) => setFormData({ ...formData, targetIPGroup: e.target.value })}
                      className="w-full mt-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingGroups}
                    >
                      <option value="">{loadingGroups ? 'Loading...' : 'Select IP Group'}</option>
                      {ipGroups.map((group) => (
                        <option key={group._id} value={group._id}>{group.name}</option>
                      ))}
                    </select>
                  )}
                </label>

                {/* Multiple IP Groups */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.targetType === 'multiple_ip_groups' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetType"
                      value="multiple_ip_groups"
                      checked={formData.targetType === 'multiple_ip_groups'}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Multiple IP Groups</span>
                      <p className="text-sm text-slate-600">Block multiple pre-defined device groups</p>
                    </div>
                  </div>
                  {formData.targetType === 'multiple_ip_groups' && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {loadingGroups ? (
                        <div className="text-center py-4 text-slate-600">Loading groups...</div>
                      ) : ipGroups.length === 0 ? (
                        <div className="text-center py-4 text-slate-600">No IP groups available</div>
                      ) : (
                        ipGroups.map((group) => (
                          <label
                            key={group._id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                              formData.targetIPGroups.includes(group._id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.targetIPGroups.includes(group._id)}
                              onChange={() => toggleIPGroup(group._id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-slate-800">{group.name}</div>
                              {group.description && <div className="text-sm text-slate-600">{group.description}</div>}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </label>

                {/* All Users */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.targetType === 'all' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="targetType"
                      value="all"
                      checked={formData.targetType === 'all'}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">All Users</span>
                      <p className="text-sm text-slate-600">Apply to all devices on the network</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: WHAT should be blocked? */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">WHAT should be blocked?</h3>
              <p className="text-sm text-slate-600 mb-4">Choose what content or services to block</p>

              <div className="space-y-4">
                {/* Specific Domains */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.blockType === 'specific_domains' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="specific_domains"
                      checked={formData.blockType === 'specific_domains'}
                      onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Specific Domains</span>
                      <p className="text-sm text-slate-600">Block specific websites</p>
                    </div>
                  </div>
                  {formData.blockType === 'specific_domains' && (
                    <div className="mt-3 space-y-2">
                      <div className="space-y-2">
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
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add Domain
                        </button>
                      </div>
                      {formData.domains.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {formData.domains.map((domainEntry, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                              <div className="flex-1">
                                <span className="text-sm font-medium text-slate-700">{domainEntry.domain}</span>
                                <div className="flex items-center mt-1 space-x-2">
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    domainEntry.isWildcard
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {domainEntry.isWildcard ? '🌐 With Subdomains' : '🎯 Exact Match'}
                                  </span>
                                </div>
                              </div>
                              <button onClick={() => removeDomain(domainEntry.domain)} className="text-red-600 hover:text-red-700 ml-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </label>

                {/* Single Domain Group */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.blockType === 'domain_group' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="domain_group"
                      checked={formData.blockType === 'domain_group'}
                      onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Domain Group</span>
                      <p className="text-sm text-slate-600">Block a pre-defined category of websites</p>
                    </div>
                  </div>
                  {formData.blockType === 'domain_group' && (
                    <select
                      value={formData.domainGroup}
                      onChange={(e) => setFormData({ ...formData, domainGroup: e.target.value })}
                      className="w-full mt-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingGroups}
                    >
                      <option value="">{loadingGroups ? 'Loading...' : 'Select Domain Group'}</option>
                      {domainGroups.map((group) => (
                        <option key={group._id} value={group._id}>{group.name}</option>
                      ))}
                    </select>
                  )}
                </label>

                {/* Multiple Domain Groups */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.blockType === 'multiple_domain_groups' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="multiple_domain_groups"
                      checked={formData.blockType === 'multiple_domain_groups'}
                      onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Multiple Domain Groups</span>
                      <p className="text-sm text-slate-600">Block multiple categories of websites</p>
                    </div>
                  </div>
                  {formData.blockType === 'multiple_domain_groups' && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {loadingGroups ? (
                        <div className="text-center py-4 text-slate-600">Loading groups...</div>
                      ) : domainGroups.length === 0 ? (
                        <div className="text-center py-4 text-slate-600">No domain groups available</div>
                      ) : (
                        domainGroups.map((group) => (
                          <label
                            key={group._id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                              formData.domainGroups.includes(group._id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.domainGroups.includes(group._id)}
                              onChange={() => toggleDomainGroup(group._id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-slate-800">{group.name}</div>
                              {group.description && <div className="text-sm text-slate-600">{group.description}</div>}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </label>

                {/* Full Internet */}
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.blockType === 'full_internet' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="blockType"
                      value="full_internet"
                      checked={formData.blockType === 'full_internet'}
                      onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                      className="w-4 h-4 text-red-600"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-slate-800">Full Internet Access</span>
                      <p className="text-sm text-slate-600">Block all internet access</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Policy Details */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Policy Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Policy Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Block Social Media for Guest WiFi"
                    value={formData.policyName}
                    onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block font-medium text-slate-800">Active</label>
                    <p className="text-sm text-slate-600">Enable this policy immediately</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Policy Summary</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="font-medium">• Target:</li>
                    <li className="ml-4">
                      {formData.targetType === 'all' && 'All Users'}
                      {formData.targetType === 'single_ip' && formData.targetIP}
                      {formData.targetType === 'multiple_ips' && `${formData.targetIPs.length} IP Address(es)`}
                      {formData.targetType === 'ip_group' && (ipGroups.find(g => g._id === formData.targetIPGroup)?.name || 'IP Group')}
                      {formData.targetType === 'multiple_ip_groups' && `${formData.targetIPGroups.length} IP Group(s)`}
                    </li>
                    <li className="font-medium mt-2">• Blocking:</li>
                    <li className="ml-4">
                      {formData.blockType === 'full_internet' && 'Full Internet Access'}
                      {formData.blockType === 'specific_domains' && `${formData.domains.length} Domain(s)`}
                      {formData.blockType === 'domain_group' && (domainGroups.find(g => g._id === formData.domainGroup)?.name || 'Domain Group')}
                      {formData.blockType === 'multiple_domain_groups' && `${formData.domainGroups.length} Domain Group(s)`}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            disabled={loading}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={!canProceed() || loading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              canProceed() && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading && step === 3 && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{step === 3 ? (loading ? 'Creating...' : 'Create Policy') : 'Next'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
