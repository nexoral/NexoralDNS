'use client';

import { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import config, { getApiUrl } from '../config/keys';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl('LOGIN'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(config.AUTH.TOKEN_KEY, data.token);
        if (data.refreshToken) {
          localStorage.setItem(config.AUTH.REFRESH_TOKEN_KEY, data.refreshToken);
        }
        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid credentials');
      }
    } catch (error) {
      setToast({
        show: true,
        message: error.message || 'Login failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{config.APP_NAME}</h1>
          <p className="text-slate-400">Admin Control Panel</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-2xl font-semibold text-white text-center mb-6">
            Sign In to Dashboard
          </h2>

          <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Secure DNS Management System
            </p>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
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
