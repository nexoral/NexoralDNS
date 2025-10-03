'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiMenu, FiBell, FiChevronDown, FiUser,
  FiSettings, FiHelpCircle, FiLogOut
} from 'react-icons/fi';
import useAuthStore from '../../stores/authStore';
import config, { getApiUrl } from '../../config/keys';

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [displayName, setDisplayName] = useState('User');
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const router = useRouter();

  // Get user data and logout function from auth store
  const { user, logout, token, isAuthenticated } = useAuthStore();

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
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
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

  // Handle logout click
  const handleLogout = async () => {
    try {
      logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
      router.push('/');
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Left Side - Menu Button and Logo */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <FiMenu className="h-6 w-6" />
          </button>

          <div className="ml-4">
            <span className="text-lg font-semibold text-gray-800">
              {sidebarOpen ? config.APP_NAME : 'N'}
            </span>
          </div>
        </div>

        {/* Right Side - Notifications and User Dropdown */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 relative"
            >
              <FiBell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 again-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Notification Items would go here */}
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <p className="text-sm text-gray-600">No new notifications</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <a href="#" className="text-xs text-blue-600 hover:text-blue-800">View all notifications</a>
                </div>
              </div>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <span className="text-sm font-medium">{displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-sm font-medium">{displayName}</span>
              </div>
              <FiChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {/* User Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <Link href="/dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <FiUser className="h-4 w-4 mr-2 text-gray-500" />
                  Profile
                </Link>
                <Link href="/dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <FiSettings className="h-4 w-4 mr-2 text-gray-500" />
                  Settings
                </Link>
                <Link href="/help" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <FiHelpCircle className="h-4 w-4 mr-2 text-gray-500" />
                  Help
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <FiLogOut className="h-4 w-4 mr-2 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
