'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';
import { api } from '../../services/api';
import useAuthStore from '../../stores/authStore';

export default function ChangePasswordModal({
  onClose,
  isRequired = false,
  title = "Change Password",
  description = "Update your password to secure your account"
}) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z\d]/.test(password)) strength += 1;
    const strengthMap = {
      0: { label: 'Too weak', color: 'bg-[var(--red)]' },
      1: { label: 'Weak', color: 'bg-[var(--red)]' },
      2: { label: 'Fair', color: 'bg-[var(--amber)]' },
      3: { label: 'Good', color: 'bg-[var(--amber)]' },
      4: { label: 'Strong', color: 'bg-[var(--green)]' },
      5: { label: 'Very Strong', color: 'bg-[var(--green)]' }
    };
    return { strength, ...strengthMap[strength] };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validateForm = () => {
    const newErrors = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!newPassword) newErrors.newPassword = 'New password is required';
    else if (newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await api.changePassword({ currentPassword, newPassword });
      if (response.data && response.data.statusCode === 200) {
        toast.success('Password changed successfully! Please login again with your new password.');
        onClose();
        setTimeout(() => { logout(); router.push('/'); }, 1500);
      } else {
        const errorMessage = response.data?.data || response.data?.message || 'Failed to change password';
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.response?.data) {
        if (typeof error.response.data.data === 'string') errorMessage = error.response.data.data;
        else if (error.response.data.message) errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (!isRequired) onClose();
  };

  if (!mounted) return null;

  const EyeIcon = ({ show }) => show ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const inputClass = (hasError) => `w-full px-3 py-2.5 border ${
    hasError ? 'border-[rgba(255,96,113,0.5)]' : 'border-[var(--border-4)]'
  } rounded-lg focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-[var(--blue)]/60 bg-[var(--surface-2)] text-[var(--text-1)] placeholder-[var(--text-6)] text-sm pr-10`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-3)] shadow-2xl max-w-md w-full animate-fade-in-up">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[rgba(91,140,255,0.12)] rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[var(--blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-1)]">{title}</h2>
                <p className="text-xs text-[var(--text-3)]">{description}</p>
              </div>
            </div>
            {!isRequired && (
              <button
                onClick={onClose}
                className="p-1.5 text-[var(--text-6)] hover:text-[var(--text-1)] transition-colors rounded-lg hover:bg-[var(--surface-2)]"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="mx-5 mt-5 bg-[rgba(91,140,255,0.07)] border border-[rgba(91,140,255,0.2)] rounded-lg p-4">
          <div className="flex">
            <svg className="w-4 h-4 text-[var(--blue)] mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-[var(--blue)] text-sm">
                {isRequired ? 'Password Update Required' : 'Security Recommendation'}
              </h3>
              <p className="text-xs text-[var(--text-3)] mt-1">
                {isRequired
                  ? 'For security reasons, you must update your password before continuing.'
                  : 'You have not set a custom password yet. We strongly recommend updating it to secure your account.'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-5 space-y-4">
          {[
            { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, toggleShow: () => setShowCurrentPassword(!showCurrentPassword), error: errors.currentPassword, placeholder: 'Enter current password', errorKey: 'currentPassword' },
            { label: 'New Password', value: newPassword, setter: setNewPassword, show: showNewPassword, toggleShow: () => setShowNewPassword(!showNewPassword), error: errors.newPassword, placeholder: 'Enter new password', errorKey: 'newPassword', showStrength: true },
            { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, toggleShow: () => setShowConfirmPassword(!showConfirmPassword), error: errors.confirmPassword, placeholder: 'Confirm new password', errorKey: 'confirmPassword' },
          ].map(({ label, value, setter, show, toggleShow, error, placeholder, errorKey, showStrength }) => (
            <div key={errorKey}>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => { setter(e.target.value); setErrors({ ...errors, [errorKey]: '' }); }}
                  className={inputClass(!!error)}
                  placeholder={placeholder}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={toggleShow}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-6)] hover:text-[var(--text-3)] transition-colors"
                >
                  <EyeIcon show={show} />
                </button>
              </div>
              {error && <p className="text-xs text-[var(--red)] mt-1">{error}</p>}
              {showStrength && value && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-5)]">Password Strength</span>
                    <span className={`text-xs font-medium ${passwordStrength.strength >= 3 ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--surface-3)] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-[var(--text-6)] mt-1">Use 10+ characters with a mix of letters, numbers & symbols</p>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end space-x-3 pt-2">
            {!isRequired && (
              <Button type="button" variant="secondary" onClick={handleSkip} disabled={isLoading}>
                Skip for Now
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Changing...
                </span>
              ) : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
