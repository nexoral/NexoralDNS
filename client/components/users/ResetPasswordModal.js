'use client';

import { useState } from 'react';
import Button from '../ui/Button';

const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^a-zA-Z\d]/.test(password)) strength += 1;
  const strengthMap = {
    0: { label: 'Too weak', color: 'bg-[#ff6071]' },
    1: { label: 'Weak', color: 'bg-[#ff6071]' },
    2: { label: 'Fair', color: 'bg-[#f6b352]' },
    3: { label: 'Good', color: 'bg-[#f6b352]' },
    4: { label: 'Strong', color: 'bg-[#3ddc84]' },
    5: { label: 'Very Strong', color: 'bg-[#3ddc84]' }
  };
  return { strength, ...strengthMap[strength] };
};

export default function ResetPasswordModal({ user, onClose, onSave }) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordStrength.strength < 3) {
      setError('Password is too weak — use 8+ characters with upper/lowercase letters and a number');
      return;
    }
    setIsSaving(true);
    await onSave(newPassword);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.18)] shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-[rgba(130,165,220,0.14)]">
          <h2 className="text-lg font-semibold text-[#e7eef6]">Reset Password</h2>
          <p className="text-sm text-[#9aa8bd] mt-1">
            Set a new temporary password for <span className="font-medium text-[#cdd9e8]">{user.username}</span>.
            They'll be signed out and required to change it on next login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <input
              type="password"
              placeholder="New temporary password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-3 bg-white/6 border border-[rgba(130,165,220,0.2)] rounded-lg text-[#e7eef6] placeholder-[#5f6b7d] focus:outline-none focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-[#5b8cff]/60"
            />
            {error && <p className="text-xs text-[#ff6071] mt-1">{error}</p>}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#7c8aa0]">Password Strength</span>
                  <span className={`text-xs font-medium ${passwordStrength.strength >= 3 ? 'text-[#3ddc84]' : 'text-[#f6b352]'}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Reset Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
