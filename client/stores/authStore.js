'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Skip persist on server side
const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : undefined;

const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      passwordUpdatedAt: null,

      login: (data) => {
        const userData = {
          id: data.data?.user?.id || data.user?.id,
          username: data.data?.user?.username || data.user?.username || 'User',
          createdAt: data.data?.user?.createdAt || data.user?.createdAt || null,
          isActive: data.data?.user?.isActive ?? data.user?.isActive ?? true,
        };

        const permissionsData = (data.data?.role?.permissions || data.data?.permissions || []).map(p => ({
          _id: p._id,
          code: p.code,
          name: p.name
        }));

        const roleData = data.data?.role ? {
          id: data.data.role.id || data.data.role._id,
          name: data.data.role.name || 'Unknown Role',
        } : null;

        const newPasswordUpdatedAt = data.data?.user?.passwordUpdatedAt ||
                                     data.user?.passwordUpdatedAt ||
                                     null;

        const currentState = get();
        const passwordUpdatedAt = newPasswordUpdatedAt || currentState.passwordUpdatedAt;

        set({
          user: userData,
          isAuthenticated: true,
          role: roleData,
          permissions: permissionsData,
          passwordUpdatedAt: passwordUpdatedAt
        });
      },

      logout: async () => {
        // Call server to invalidate session and clear httpOnly cookies
        try {
          const { api } = await import('../services/api');
          await api.logout();
        } catch (_) {
          // Ignore logout errors — still clear client state
        }

        if (typeof window !== 'undefined') {
          localStorage.clear();
        }

        set({
          user: null,
          isAuthenticated: false,
          role: null,
          permissions: [],
          passwordUpdatedAt: null
        });
      },

      hasPermission: (permissionCode) => {
        const { permissions } = get();
        return Array.isArray(permissions) &&
          permissions.some(p => p && typeof p === 'object' && p.code === permissionCode);
      },

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
        // Tokens are in httpOnly cookies — only persist non-sensitive UI state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        role: state.role,
        passwordUpdatedAt: state.passwordUpdatedAt,
      }),
    }
  )
);

export default useAuthStore;
