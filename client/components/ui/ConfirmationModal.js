'use client';

import { useState, useEffect } from 'react';
import Button from './Button';

export default function ConfirmationModal({
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onClose,
  onConfirm,
  requireTextConfirmation = false,
  confirmationValue = '',
  children
}) {
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConfirm = () => {
    if (requireTextConfirmation && inputValue !== confirmationValue) {
      return;
    }
    onConfirm();
  };

  if (!mounted) {
    return null;
  }

  const isConfirmDisabled = requireTextConfirmation && inputValue !== confirmationValue;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const style = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${style.iconBg} rounded-full flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${style.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-600">{description}</p>
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
          {children}

          {requireTextConfirmation && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <strong>{confirmationValue}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={`Type "${confirmationValue}" to confirm`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-500"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : style.buttonBg}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
