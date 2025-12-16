'use client';

import { useState } from 'react';

export default function CreatePolicyModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    policyType: '',
    targetType: '',
    targetIP: '',
    targetIPGroup: '',
    blockType: '',
    domains: [],
    domainGroup: '',
    policyName: '',
    isActive: true
  });
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const policyTypes = [
    { id: 'user_domain', label: 'Block user from specific domains', icon: '🚫' },
    { id: 'user_internet', label: 'Block user from internet entirely', icon: '🌐' },
    { id: 'domain_all', label: 'Block domain for all users', icon: '🛑' },
    { id: 'domain_user', label: 'Block domain for specific user', icon: '👤' },
    { id: 'group_based', label: 'Advanced (use groups)', icon: '⚙️' }
  ];

  const domainGroups = [
    { id: 'social', name: 'Social Media' },
    { id: 'streaming', name: 'Streaming Sites' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'adult', name: 'Adult Content' },
    { id: 'ads', name: 'Ads & Trackers' }
  ];

  const ipGroups = [
    { id: 'guest', name: 'Guest WiFi Devices' },
    { id: 'office', name: 'Office Devices' },
    { id: 'kids', name: 'Kids Devices' }
  ];

  const addDomain = () => {
    if (newDomain && !formData.domains.includes(newDomain)) {
      setFormData({ ...formData, domains: [...formData.domains, newDomain] });
      setNewDomain('');
    }
  };

  const removeDomain = (domain) => {
    setFormData({ ...formData, domains: formData.domains.filter(d => d !== domain) });
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      // Modal will be closed by parent component on success
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error in modal:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.policyType !== '';
      case 2:
        return formData.targetType !== '' && (
          formData.targetType === 'all' ||
          (formData.targetType === 'single_ip' && formData.targetIP !== '') ||
          (formData.targetType === 'ip_group' && formData.targetIPGroup !== '')
        );
      case 3:
        return formData.blockType !== '' && (
          formData.blockType === 'full_internet' ||
          (formData.blockType === 'specific_domains' && formData.domains.length > 0) ||
          (formData.blockType === 'domain_group' && formData.domainGroup !== '')
        );
      case 4:
        return formData.policyName !== '';
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Create Blocking Policy</h2>
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-slate-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600">
            <span>Type</span>
            <span>Target</span>
            <span>Block</span>
            <span>Details</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Step 1: Choose Type */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">What type of block?</h3>
              <div className="space-y-3">
                {policyTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.policyType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policyType"
                      value={type.id}
                      checked={formData.policyType === type.id}
                      onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-3">{type.icon}</span>
                    <span className="font-medium text-slate-800">{type.label}</span>
                    {formData.policyType === type.id && (
                      <svg className="w-5 h-5 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Target (Who) */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Who should be affected?</h3>
              <div className="space-y-4">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.targetType === 'single_ip'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="single_ip"
                    checked={formData.targetType === 'single_ip'}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">Single IP</span>
                </label>
                {formData.targetType === 'single_ip' && (
                  <input
                    type="text"
                    placeholder="e.g., 192.168.1.100"
                    value={formData.targetIP}
                    onChange={(e) => setFormData({ ...formData, targetIP: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.targetType === 'ip_group'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="ip_group"
                    checked={formData.targetType === 'ip_group'}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">IP Group</span>
                </label>
                {formData.targetType === 'ip_group' && (
                  <select
                    value={formData.targetIPGroup}
                    onChange={(e) => setFormData({ ...formData, targetIPGroup: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select IP Group</option>
                    {ipGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.targetType === 'all'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="targetType"
                    value="all"
                    checked={formData.targetType === 'all'}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">All Users</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Select Block Scope (What) */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">What to block?</h3>
              <div className="space-y-4">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.blockType === 'specific_domains'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="blockType"
                    value="specific_domains"
                    checked={formData.blockType === 'specific_domains'}
                    onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">Specific domains</span>
                </label>
                {formData.blockType === 'specific_domains' && (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {formData.domains.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {formData.domains.map((domain, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-sm text-slate-700">{domain}</span>
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
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.blockType === 'domain_group'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="blockType"
                    value="domain_group"
                    checked={formData.blockType === 'domain_group'}
                    onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">Domain Group</span>
                </label>
                {formData.blockType === 'domain_group' && (
                  <select
                    value={formData.domainGroup}
                    onChange={(e) => setFormData({ ...formData, domainGroup: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Domain Group</option>
                    {domainGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                  formData.blockType === 'full_internet'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="blockType"
                    value="full_internet"
                    checked={formData.blockType === 'full_internet'}
                    onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-slate-800">Full Internet</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
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
                    <li>• Type: {policyTypes.find(t => t.id === formData.policyType)?.label}</li>
                    <li>• Target: {formData.targetType === 'all' ? 'All Users' : formData.targetType === 'single_ip' ? formData.targetIP : ipGroups.find(g => g.id === formData.targetIPGroup)?.name}</li>
                    <li>• Block: {formData.blockType === 'full_internet' ? 'Full Internet' : formData.blockType === 'specific_domains' ? `${formData.domains.length} domain(s)` : domainGroups.find(g => g.id === formData.domainGroup)?.name}</li>
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
            onClick={step === 4 ? handleSubmit : handleNext}
            disabled={!canProceed() || loading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              canProceed() && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading && step === 4 && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{step === 4 ? (loading ? 'Creating...' : 'Create Policy') : 'Next'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
