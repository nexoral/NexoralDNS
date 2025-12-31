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
      passwordUpdatedAt: null,

      login: (data) => {
        if (data.token && !data.user && !data.data) {
          set({
            token: data.token,
            isAuthenticated: true
          });
          return;
        }

        const userData = {
          id: data.data?.user?.id || data.user?.id,
          username: data.data?.user?.username || data.user?.username || 'User',
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
          token: data.token || data.data?.token,
          user: userData,
          isAuthenticated: true,
          role: roleData,
          permissions: permissionsData,
          passwordUpdatedAt: passwordUpdatedAt
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(config.AUTH.TOKEN_KEY, data.token || data.data?.token);
          if (data.refreshToken || data.data?.refreshToken) {
            localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, data.refreshToken || data.data?.refreshToken);
          }
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.clear();
        }

        set({
          token: null,
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
        token: state.token,
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
