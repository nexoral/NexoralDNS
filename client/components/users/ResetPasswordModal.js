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
    0: { label: 'Too weak', color: 'bg-[var(--red)]' },
    1: { label: 'Weak', color: 'bg-[var(--red)]' },
    2: { label: 'Fair', color: 'bg-[var(--amber)]' },
    3: { label: 'Good', color: 'bg-[var(--amber)]' },
    4: { label: 'Strong', color: 'bg-[var(--green)]' },
    5: { label: 'Very Strong', color: 'bg-[var(--green)]' }
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
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-3)] shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-[var(--border-2)]">
          <h2 className="text-lg font-semibold text-[var(--text-1)]">Reset Password</h2>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Set a new temporary password for <span className="font-medium text-[var(--text-2)]">{user.username}</span>.
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
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border-4)] rounded-lg text-[var(--text-1)] placeholder-[var(--text-6)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/50 focus:border-[var(--blue)]/60"
            />
            {error && <p className="text-xs text-[var(--red)] mt-1">{error}</p>}
            {newPassword && (
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
