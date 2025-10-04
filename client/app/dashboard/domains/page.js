'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../../components/dashboard/Sidebar';
import Header from '../../../components/dashboard/Header';
import Button from '../../../components/ui/Button';
import DomainCard from '../../../components/domains/DomainCard';
import DomainModal from '../../../components/domains/DomainModal';
import RecordModal from '../../../components/domains/RecordModal';
import BlockModal from '../../../components/domains/BlockModal';
import DeleteConfirmModal from '../../../components/domains/DeleteConfirmModal';
import useAuthStore from '../../../stores/authStore';
import { getApiUrl } from '../../../config/keys';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

export default function DomainsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedDomainForBlock, setSelectedDomainForBlock] = useState(null);
  const [selectedDomainForDelete, setSelectedDomainForDelete] = useState(null);
  const [domains, setDomains] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, token } = useAuthStore();

  // Fetch domains from API
  const fetchDomains = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authToken = token || localStorage.getItem('nexoral_auth_token');

      const response = await fetch(getApiUrl('GET_ALL_DOMAINS'), {
        method: 'GET',
        headers: {
          'Authorization': `${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const result = await response.json();

      if (result.statusCode === 200) {
        // Transform API response to match expected format
        const transformedDomains = (result.data.domains || []).map(domain => ({
          id: domain._id,
          name: domain.domain,
          status: domain.domainStatus,
          records: domain.dnsRecords ? domain.dnsRecords.length : 0,
          created: new Date(domain.createdAt).toISOString().split('T')[0],
          lastModified: new Date(domain.updatedAt).toISOString().split('T')[0],
          dnsRecords: domain.dnsRecords || [],
          // Keep original data for API operations
          _original: domain
        }));

        setDomains(transformedDomains);
      } else {
        throw new Error(result.message || 'Failed to fetch domains');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching domains:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch domains on component mount
  useEffect(() => {
    fetchDomains();
  }, [token]);

  const handleAddDomain = (newDomain) => {
    // Refresh the domains list after adding a new domain
    fetchDomains();
  };

  const handleDeleteDomain = (domain) => {
    setSelectedDomainForDelete(domain);
    setShowDeleteModal(true);
  };

  const confirmDeleteDomain = (id) => {
    // Delete domain logic would go here
    // For now just remove from local state
    setDomains(prev => prev.filter(domain => domain.id !== id));
    // After API call would call fetchDomains() to refresh
  };

  const handleManageRecords = (domain) => {
    setSelectedDomain(domain);
    setShowRecordModal(true);
  };

  const handleBlockDomain = (domain) => {
    setSelectedDomainForBlock(domain);
    setShowBlockModal(true);
  };

  const handleSaveBlock = (blockSettings) => {
    // Block domain logic would go here
    console.log('Block settings:', blockSettings);
  };

  // Calculate total records across all domains
  const totalRecords = domains.reduce((sum, d) => sum + d.records, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Domain Management</h1>
              <p className="text-slate-600">Manage your domains and DNS records</p>
            </div>
            <Button onClick={() => setShowDomainModal(true)} variant="primary">
              Add Domain
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Domains</p>
                  <p className="text-2xl font-bold text-slate-800">{domains.length}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9 3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Domains</p>
                  <p className="text-2xl font-bold text-slate-800">{domains.filter(d => d.status === 'active').length}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Records</p>
                  <p className="text-2xl font-bold text-slate-800">{totalRecords}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Domains List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Your Domains</h2>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="p-6 text-center">
                <LoadingSpinner />
                <p className="mt-2 text-gray-600">Loading domains...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                      <button
                        onClick={fetchDomains}
                        className="mt-2 text-sm text-red-700 font-medium underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Domains List */}
            {!isLoading && !error && (
              <div className="p-6">
                <div className="grid gap-4">
                  {domains.map((domain) => (
                    <DomainCard
                      key={domain.id}
                      domain={domain}
                      onDelete={() => handleDeleteDomain(domain)}
                      onManageRecords={() => handleManageRecords(domain)}
                      onBlock={() => handleBlockDomain(domain)}
                    />
                  ))}
                </div>

                {domains.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🌐</div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">No domains configured</h3>
                    <p className="text-slate-600 mb-4">Add your first domain to get started</p>
                    <Button onClick={() => setShowDomainModal(true)}>
                      Add First Domain
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Add Domain Modal */}
      {showDomainModal && (
        <DomainModal
          onClose={() => setShowDomainModal(false)}
          onSave={handleAddDomain}
        />
      )}

      {/* DNS Records Modal */}
      {showRecordModal && selectedDomain && (
        <RecordModal
          domain={selectedDomain}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedDomain(null);
          }}
        />
      )}

      {/* Block Domain Modal */}
      {showBlockModal && selectedDomainForBlock && (
        <BlockModal
          domain={selectedDomainForBlock}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedDomainForBlock(null);
          }}
          onSave={handleSaveBlock}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDomainForDelete && (
        <DeleteConfirmModal
          domain={selectedDomainForDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedDomainForDelete(null);
          }}
          onConfirm={confirmDeleteDomain}
        />
      )}
    </div>
  );
}
