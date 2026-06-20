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
    if (requireTextConfirmation && inputValue !== confirmationValue) return;
    onConfirm();
  };

  if (!mounted) return null;

  const isConfirmDisabled = requireTextConfirmation && inputValue !== confirmationValue;

  const variantStyles = {
    danger: { iconColor: 'text-[#ff6071]', iconBg: 'bg-[rgba(255,96,113,0.12)]' },
    warning: { iconColor: 'text-[#f6b352]', iconBg: 'bg-[rgba(246,179,82,0.12)]' },
    info: { iconColor: 'text-[#5b8cff]', iconBg: 'bg-[rgba(91,140,255,0.12)]' }
  };

  const style = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.18)] shadow-2xl max-w-md w-full animate-fade-in-up">
        <div className="p-5 border-b border-[rgba(130,165,220,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 ${style.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-4 h-4 ${style.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#e7eef6]">{title}</h2>
                <p className="text-xs text-[#9aa8bd]">{description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#5f6b7d] hover:text-[#e7eef6] transition-colors rounded-lg hover:bg-white/6"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {children}

          {requireTextConfirmation && (
            <div>
              <label className="block text-sm font-medium text-[#cdd9e8] mb-2">
                Type <strong className="text-[#e7eef6]">{confirmationValue}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={`Type "${confirmationValue}" to confirm`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(130,165,220,0.2)] rounded-lg focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-[#5b8cff]/60 bg-white/6 text-[#e7eef6] placeholder-[#5f6b7d] text-sm"
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
