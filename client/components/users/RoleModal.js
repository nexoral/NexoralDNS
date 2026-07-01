'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import InputField from '../ui/InputField';

export default function RoleModal({ role, permissions, onClose, onSave }) {
  const isEdit = Boolean(role);
  const [formData, setFormData] = useState({
    name: role?.name || '',
    permissionCodes: role?.permissions?.map(p => p.code) || []
  });
  const [error, setError] = useState('');

  const togglePermission = (code) => {
    const isSelected = formData.permissionCodes.includes(code);
    if (isSelected) {
      setFormData({ ...formData, permissionCodes: formData.permissionCodes.filter(c => c !== code) });
    } else {
      setFormData({ ...formData, permissionCodes: [...formData.permissionCodes, code] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }
    if (formData.permissionCodes.length === 0) {
      setError('Select at least one permission');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.18)] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(130,165,220,0.14)]">
          <h2 className="text-lg font-semibold text-[#e7eef6]">
            {isEdit ? 'Edit Role' : 'Create Role'}
          </h2>
          <p className="text-sm text-[#9aa8bd] mt-1">Choose which permissions this role grants</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            type="text"
            name="name"
            placeholder="Role name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-[#cdd9e8] mb-2">Permissions</label>
            <div className="space-y-1 max-h-72 overflow-y-auto p-2 bg-[#07090e] rounded-lg border border-[rgba(130,165,220,0.1)]">
              {permissions.map((permission) => (
                <label
                  key={permission._id}
                  className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissionCodes.includes(permission.code)}
                    onChange={() => togglePermission(permission.code)}
                    className="w-4 h-4 text-[#5b8cff] rounded"
                  />
                  <span className="ml-3 text-sm text-[#e7eef6]">{permission.name}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-[#ff6071]">{error}</p>}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEdit ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
