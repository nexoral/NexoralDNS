'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiMenu, FiChevronDown, FiUser,
  FiSettings, FiHelpCircle, FiLogOut, FiSun, FiMoon
} from 'react-icons/fi';
import useAuthStore from '../../stores/authStore';
import useThemeStore from '../../stores/themeStore';
import config, { getApiUrl } from '../../config/keys';
import ConfirmationModal from '../ui/ConfirmationModal';

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

export default function Header({ onMenuClick, sidebarOpen }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [displayName, setDisplayName] = useState('User');
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Get user data and logout function from auth store
  const { user, logout, token, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      // If we already have a user in store, use that
      if (user?.username) {
        setDisplayName(user.username);
        return;
      }

      // Otherwise try to get from localStorage and parse JWT if needed
      try {
        // First check for token in localStorage directly
        const authToken = localStorage.getItem(config.AUTH.TOKEN_KEY);
        if (authToken) {
          // Parse JWT to get username
          const decodedToken = parseJwt(authToken);
          if (decodedToken?.data?.username) {
            setDisplayName(decodedToken.data.username);
            return;
          }
        }

        // Try getting from Zustand persisted state
        const storedAuth = localStorage.getItem('nexoral-auth-storage');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);

          // If user exists in store, use it
          if (authData.state?.user?.username) {
            setDisplayName(authData.state.user.username);
            return;
          }

          // If user is null but token exists, parse the token
          if (authData.state?.token) {
            const decoded = parseJwt(authData.state.token);
            if (decoded?.data?.username) {
              setDisplayName(decoded.data.username);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error restoring username:", err);
      }
    };

    initAuth();
  }, []);

  // Also update displayName whenever user or token changes
  useEffect(() => {
    if (user?.username) {
      setDisplayName(user.username);
    } else if (token && !user) {
      // If we have token but no user, extract username from token
      const decoded = parseJwt(token);
      if (decoded?.data?.username) {
        setDisplayName(decoded.data.username);
      }
    }
  }, [user, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown with key handler for better accessibility
  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  // Handle logout click - show confirmation modal
  const handleLogout = () => {
    setDropdownOpen(false);
    setShowLogoutModal(true);
  };

  // Confirm logout
  const confirmLogout = async () => {
    try {
      logout();
      setShowLogoutModal(false);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
      setShowLogoutModal(false);
      router.push('/');
    }
  };

  return (
    <header className="bg-[var(--sidebar-bg)] border-b border-[var(--border)]">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
        {/* Left Side - Menu Button and Logo */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] focus:outline-none transition-colors"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <div className="ml-4">
            <span className="text-base font-semibold text-[var(--text-1)] tracking-tight">
              {sidebarOpen ? config.APP_NAME : 'N'}
            </span>
          </div>
        </div>

        {/* Right Side - User Dropdown */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="mr-3 p-2 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-hover)] focus:outline-none transition-colors"
            aria-label="Toggle light/dark theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-[var(--text-2)] hover:text-[var(--text-1)] focus:outline-none transition-colors"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--blue)] to-[var(--teal)] flex items-center justify-center text-white text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block text-sm font-medium">{displayName}</span>
              </div>
              <FiChevronDown className="h-4 w-4 text-[var(--text-6)]" />
            </button>

            {/* User Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--card-bg)] rounded-xl shadow-xl py-1 z-50 border border-[var(--border-2)] animate-slide-down">
                <Link href="/dashboard/profile" className="flex items-center px-4 py-2.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] transition-colors">
                  <FiUser className="h-4 w-4 mr-2 text-[var(--text-6)]" />
                  Profile
                </Link>
                <Link href="/dashboard/settings" className="flex items-center px-4 py-2.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] transition-colors">
                  <FiSettings className="h-4 w-4 mr-2 text-[var(--text-6)]" />
                  Settings
                </Link>
                <a href="https://dns.nexoral.in" target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] transition-colors">
                  <FiHelpCircle className="h-4 w-4 mr-2 text-[var(--text-6)]" />
                  Help
                </a>
                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center px-4 py-2.5 text-sm text-[var(--red)] hover:bg-[rgba(255,96,113,0.08)] transition-colors"
                  >
                    <FiLogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ConfirmationModal
          title="Logout"
          description="Are you sure you want to logout?"
          confirmText="Logout"
          cancelText="Cancel"
          variant="warning"
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        >
          <div className="bg-[rgba(246,179,82,0.08)] border border-[rgba(246,179,82,0.2)] rounded-lg p-4">
            <p className="text-sm text-[var(--amber)]">
              You will be logged out of your current session and redirected to the login page.
            </p>
          </div>
        </ConfirmationModal>
      )}
    </header>
  );
}
