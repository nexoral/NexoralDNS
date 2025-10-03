'use client';

import { useState, useEffect } from 'react';
import Button from '../ui/Button';

export default function DeleteConfirmModal({ domain, onClose, onConfirm }) {
  const [mounted, setMounted] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConfirm = () => {
    if (confirmText === domain.name) {
      onConfirm(domain.id);
      onClose();
    }
  };

  if (!mounted) {
    return null;
  }

  const isConfirmDisabled = confirmText !== domain.name;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Delete Domain</h2>
                <p className="text-sm text-slate-600">This action cannot be undone</p>
              </div>
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

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">⚠️ Critical Warning</h3>
            <p className="text-sm text-red-700 mb-3">
              Deleting <strong>{domain.name}</strong> will cause the following issues:
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>All DNS records for this domain will be permanently deleted</li>
              <li>Clients will no longer be able to resolve this domain (if it was a custom domain, not a real domain)</li>
              <li>Any blocking rules for this domain will be removed</li>
              <li>Website and services using this domain will become unreachable (if it was a custom domain)</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Domain Information</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Domain:</strong> {domain.name}</p>
              <p><strong>Records:</strong> {domain.records} DNS records will be deleted</p>
              <p><strong>Status:</strong> {domain.status}</p>
              <p><strong>Created:</strong> {domain.created}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type the domain name to confirm deletion:
            </label>
            <input
              type="text"
              placeholder={`Type "${domain.name}" to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-500"
            />
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
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Delete Domain
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
