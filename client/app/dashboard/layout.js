'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';

export default function DashboardLayout({ children }) {
  const { login } = useAuthStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

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

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return children;
}
