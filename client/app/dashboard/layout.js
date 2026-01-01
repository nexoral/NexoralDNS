'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import config from '../../config/keys';

// Helper to parse JWT
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT', e);
    return null;
  }
};

export default function DashboardLayout({ children }) {
  const { isAuthenticated, login } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check for token and user data in localStorage and restore auth state
    const checkAuthentication = async () => {
      // Get token from localStorage
      const token = localStorage.getItem(config.AUTH.TOKEN_KEY);

      if (token) {
        try {
          // Get persisted auth state from Zustand storage
          const persistedState = localStorage.getItem('nexoral-auth-storage');
          let passwordUpdatedAt = null;

          if (persistedState) {
            try {
              const parsedState = JSON.parse(persistedState);
              passwordUpdatedAt = parsedState.state?.passwordUpdatedAt || null;
            } catch (e) {
              console.error('Error parsing persisted state:', e);
            }
          }

          // Parse the token to get user information
          const decodedToken = parseJwt(token);

          if (decodedToken?.data) {
            // Create user object from token
            const userData = {
              id: decodedToken.data._id,
              username: decodedToken.data.username,
              roleId: decodedToken.data.roleId,
              passwordUpdatedAt: passwordUpdatedAt
            };

            // Login with user data extracted from token and persisted state
            login({
              token,
              user: userData,
              data: {
                permissions: decodedToken.data.permissions || [],
                role: decodedToken.data.role || null
              }
            });
          } else {
            // Fallback to simple token auth
            login({ token });
          }

          setIsInitialized(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Auth restoration error:', error);
          router.replace('/');
        }
      } else {
        // No token - redirect to login
        router.replace('/');
      }

      setIsInitialized(true);
    };

    checkAuthentication();
  }, []);

  // Don't render anything before initialization is complete
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Loading state after initialization but before authentication is confirmed
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If we get here, user is authenticated
  return children;
}
