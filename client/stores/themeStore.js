'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Skip persist on server side
const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : undefined;

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },

      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: 'nexoral-theme-storage',
      storage: storage,
      skipHydration: true,
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

export default useThemeStore;
