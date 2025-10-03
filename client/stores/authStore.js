'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import config from '../config/keys';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      role: null,
      permissions: [],

      // Set auth state from login response
      login: (data) => {
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          role: data.data?.roleId ? {
            id: data.data.roleId,
            name: data.data.role?.name || 'Unknown Role',
            code: data.data.role?.code
          } : null,
          permissions: data.data?.permissions || []
        });

        // Still store in localStorage for backward compatibility
        localStorage.setItem(config.AUTH.TOKEN_KEY, data.token);
        if (data.refreshToken) {
          localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, data.refreshToken);
        }
      },

      logout: () => {
        localStorage.removeItem(config.AUTH.TOKEN_KEY);
        localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          role: null,
          permissions: []
        });
      },

      // Check if user has specific permission
      hasPermission: (permissionCode) => {
        const { permissions } = get();
        return permissions.some(p => p.code === permissionCode);
      },

      // Check if user has one of the specified permissions
      hasAnyPermission: (permissionCodes) => {
        const { permissions } = get();
        return permissions.some(p => permissionCodes.includes(p.code));
      }
    }),
    {
      name: 'nexoral-auth-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useAuthStore;
