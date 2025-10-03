'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import config from '../config/keys';

// Skip persist on server side
const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : undefined;

const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      role: null,
      permissions: [],

      // Set auth state from login response
      login: (data) => {
        // Handle minimal login with just token (for session restoration)
        if (data.token && !data.user && !data.data) {
          set({
            token: data.token,
            isAuthenticated: true
          });
          return;
        }

        // Regular login handling with full data
        const userData = {
          id: data.data?.user?.id || data.user?.id,
          username: data.data?.user?.username || data.user?.username || 'User',
        };

        // Extract permissions as plain objects to ensure proper serialization
        const permissionsData = (data.data?.permissions || []).map(p => ({
          _id: p._id,
          code: p.code,
          name: p.name
        }));

        set({
          token: data.token || data.data?.token,
          user: userData,
          isAuthenticated: true,
          role: data.data?.roleId ? {
            id: data.data.roleId,
            name: data.data.role?.name || 'Unknown Role',
            code: data.data.role?.code
          } : null,
          permissions: permissionsData
        });

        // Only run localStorage operations on client side
        if (typeof window !== 'undefined') {
          localStorage.setItem(config.AUTH.TOKEN_KEY, data.token || data.data?.token);
          if (data.refreshToken || data.data?.refreshToken) {
            localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, data.refreshToken || data.data?.refreshToken);
          }
        }
      },

      logout: () => {
        // Only clear localStorage on client side
        if (typeof window !== 'undefined') {
          localStorage.removeItem(config.AUTH.TOKEN_KEY);
          localStorage.removeItem(config.AUTH.REFRESH_TOKEN_KEY);
        }

        // Reset auth state
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
        return Array.isArray(permissions) &&
          permissions.some(p => p && typeof p === 'object' && p.code === permissionCode);
      },

      // Check if user has one of the specified permissions
      hasAnyPermission: (permissionCodes) => {
        const { permissions } = get();
        return Array.isArray(permissions) &&
          permissions.some(p => p && typeof p === 'object' && permissionCodes.includes(p.code));
      }
    }),
    {
      name: 'nexoral-auth-storage',
      storage: storage,
      skipHydration: true,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        role: state.role,
      }),
    }
  )
);

export default useAuthStore;
