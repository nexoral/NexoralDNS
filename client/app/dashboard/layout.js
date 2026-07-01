'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import useThemeStore from '../../stores/themeStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';

export default function DashboardLayout({ children }) {
  const { login } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // themeStore uses skipHydration — rehydrate from localStorage once on mount
    useThemeStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Verify active session via server — access_token httpOnly cookie is sent automatically
      try {
        const response = await api.verifyToken();
        if (response.data?.statusCode === 200 && response.data?.data?.user) {
          login({ user: response.data.data.user, data: response.data.data });
          setIsInitialized(true);
          return;
        }
      } catch (_) {
        // Session invalid or expired — redirect to login
      }

      router.replace('/');
    };

    checkAuthentication();
  }, []);

  // Theme class is scoped to this dashboard-only wrapper (not <html>/<body>,
  // which are shared with the login page) so the login page never changes
  return (
    <div className={theme}>
      {!isInitialized ? (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : children}
    </div>
  );
}
