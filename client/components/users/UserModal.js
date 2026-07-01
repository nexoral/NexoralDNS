'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';

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

export default function UserModal({ user, roles, onClose, onSave }) {
  const isEdit = Boolean(user);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    roleId: user?.role?._id || user?.roleId || roles?.[0]?._id || '',
    isActive: user?.isActive !== false
  });
  const [errors, setErrors] = useState({});

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.roleId) newErrors.roleId = 'A role is required';
    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'A temporary password is required';
      } else if (passwordStrength.strength < 3) {
        newErrors.password = 'Password is too weak — use 8+ characters with upper/lowercase letters and a number';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.18)] shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-[rgba(130,165,220,0.14)]">
          <h2 className="text-lg font-semibold text-[#e7eef6]">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h2>
          <p className="text-sm text-[#9aa8bd] mt-1">
            {isEdit
              ? 'Update username, role, or account status'
              : 'Set a username and temporary password — the user must change it on first login'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
          />

          {!isEdit && (
            <div>
              <InputField
                type="password"
                name="password"
                placeholder="Temporary Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
              {formData.password && (
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
                  <p className="text-xs text-[#5f6b7d] mt-1">Use 8+ characters with upper/lowercase letters and a number</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#cdd9e8] mb-2">Role</label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[rgba(130,165,220,0.2)] rounded-lg focus:ring-2 focus:ring-[#5b8cff]/50 focus:border-transparent bg-white/6 text-[#e7eef6]"
            >
              <option value="" disabled>Select a role</option>
              {roles?.map(role => (
                <option key={role._id} value={role._id}>{role.name}</option>
              ))}
            </select>
            {errors.roleId && <p className="text-xs text-[#ff6071] mt-1">{errors.roleId}</p>}
          </div>

          {isEdit && (
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-[#cdd9e8]">Account Active</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#0d111a] after:border-[rgba(130,165,220,0.2)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEdit ? 'Update User' : 'Add User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
