'use client';

import { useState, useEffect } from 'react';
import { FiRefreshCw, FiWifi, FiGlobe, FiServer, FiGrid, FiActivity, FiClock, FiShield } from 'react-icons/fi';
import useAuthStore from '../../stores/authStore';
import config, { getApiUrl } from '../../config/keys';

export default function NetworkOverview() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuthStore();

  const fetchNetworkData = async () => {
    try {
      const authToken = token || localStorage.getItem(config.AUTH.TOKEN_KEY);

      const response = await fetch(getApiUrl('LIST_OF_DEVICES'), {
        method: 'GET',
        headers: {
          'Authorization': `${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch network data');
      }

      const result = await response.json();

      if (result.statusCode === 200) {
        setNetworkData({
          serviceName: result.data.SERVICE_NAME,
          status: result.data.Service_Status,
          lastSynced: new Date(result.data.Last_Synced_At),
          nextSync: new Date(result.data.Next_Expected_Sync_At),
          totalDevices: result.data.Total_Connected_Devices_To_Router,
          ipRange: result.data.Current_IP_Range,
          localIp: result.data.Current_Local_IP,
          subnetMask: result.data.Current_Subnet_Mask,
          wifiSSID: result.data.Current_WiFi_SSID
        });
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch network data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const authToken = token || localStorage.getItem(config.AUTH.TOKEN_KEY);

      const refreshResponse = await fetch(getApiUrl('REFRESH_DEVICE_LIST'), {
        method: 'GET',
        headers: {
          'Authorization': `${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh device list');
      }

      const refreshResult = await refreshResponse.json();

      if (refreshResult.statusCode === 200 && refreshResult.data.updatedStatus) {
        await fetchNetworkData();
      } else {
        throw new Error(refreshResult.message || 'Failed to update device list');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, [token]);

  if (loading && !networkData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
          <p className="text-gray-600">Loading network data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Network Overview</h2>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchNetworkData}
                className="mt-2 text-sm text-red-700 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!networkData) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-blue-100 mr-3">
            <FiWifi className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Network Overview</h2>
            <p className="text-gray-600">{networkData.wifiSSID}</p>
          </div>
        </div>
        <div className="flex items-center">
          <span className={`mr-3 px-2 py-1 text-xs font-medium rounded-full ${networkData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {networkData.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
          >
            <FiRefreshCw className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-1 text-gray-600">
            <FiGlobe className="mr-1 h-4 w-4" />
            <span className="text-xs font-medium">IP Range</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{networkData.ipRange}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-1 text-gray-600">
            <FiServer className="mr-1 h-4 w-4" />
            <span className="text-xs font-medium">My Local IP</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{networkData.localIp}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-1 text-gray-600">
            <FiGrid className="mr-1 h-4 w-4" />
            <span className="text-xs font-medium">Subnet Mask</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{networkData.subnetMask}</p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-1 text-gray-600">
            <FiActivity className="mr-1 h-4 w-4" />
            <span className="text-xs font-medium">Connected Devices</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{networkData.totalDevices}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center mb-2 sm:mb-0">
          <FiClock className="mr-1" />
          Last updated: {networkData.lastSynced.toLocaleString()}
        </div>
        <div className="flex items-center">
          <FiShield className="mr-1" />
          Next sync: {networkData.nextSync.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
