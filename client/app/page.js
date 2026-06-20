'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../components/auth/LoginForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import config from '../config/keys';
import useAuthStore from '../stores/authStore';
import { api } from '../services/api';
// config import kept for APP_NAME / APP_VERSION / UI constants

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        router.replace('/dashboard');
        return;
      }

      // Verify session via server — access_token cookie is sent automatically
      try {
        const response = await api.verifyToken();
        if (response.data?.statusCode === 200 && response.data?.data?.user) {
          login({ user: response.data.data.user, data: response.data.data });
          router.replace('/dashboard');
          return;
        }
      } catch (_) {
        // No active session — show login form
      }

      setIsInitializing(false);
    };

    checkAuth();
  }, [isAuthenticated, router, login]);

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await api.login(credentials);
      const responseData = response.data;

      if (responseData.statusCode === 200 && responseData.data) {
        // Tokens are stored as httpOnly cookies by the server — only persist UI data
        login({
          user: responseData.data.user,
          data: responseData.data
        });

        router.push('/dashboard');
      } else {
        const errorMessage = responseData.data || responseData.message || 'Login failed. Please try again.';
        setToast({
          show: true,
          message: errorMessage,
          type: 'error'
        });
        setIsLoading(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.data ||
                          error.response?.data?.message ||
                          error.message ||
                          'Login failed. Please try again.';
      setToast({
        show: true,
        message: errorMessage,
        type: 'error'
      });
      setIsLoading(false);
    }
  };

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-pattern"></div>

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-48 h-48 bg-[#5b8cff]/8 rounded-full blur-3xl nd-float"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#34e1d4]/6 rounded-full blur-3xl nd-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#a78bfa]/4 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative z-10 w-full max-w-md nd-rise">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-[#5b8cff] to-[#34e1d4] rounded-xl flex items-center justify-center shadow-lg nd-glow">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#e7eef6] mb-2 tracking-tight">{config.APP_NAME}</h1>
          <p className="text-[#9aa8bd] text-sm">Admin Control Panel</p>
        </div>

        <div className="bg-[#0d111a] backdrop-blur-lg rounded-2xl border border-[rgba(130,165,220,0.14)] p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-[#e7eef6] text-center mb-6">
            Sign In to Dashboard
          </h2>

          <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

          <div className="mt-6 text-center">
            <p className="text-xs text-[#5f6b7d]">
              Secure DNS Management System
            </p>
          </div>
        </div>

        <div className="text-center mt-5">
          <p className="text-xs text-[#4f5a6e]">
            {config.APP_NAME} v{config.APP_VERSION} | {config.APP_DESCRIPTION}
          </p>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: '' })}
          duration={config.UI.TOAST_DURATION}
        />
      )}
    </div>
  );
}
