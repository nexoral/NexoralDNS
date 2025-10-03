'use client';

import { useEffect, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import config, { getApiUrl } from '../../config/keys';
import {
  FiRefreshCw, FiInfo, FiXCircle, FiWifi, FiClock,
  FiServer, FiAlertCircle, FiGlobe, FiActivity,
  FiShield, FiGrid, FiMonitor
} from 'react-icons/fi';

export default function ConnectedDevices() {
  const [devices, setDevices] = useState([]);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuthStore();

  // Function to fetch the list of devices
  const fetchDevices = async () => {
    setLoading(true);
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
        throw new Error('Failed to fetch devices');
      }

      const result = await response.json();

      if (result.statusCode === 200) {
        setDevices(result.data.List_of_Connected_Devices_Info || []);
        setServiceInfo({
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
      } else {
        throw new Error(result.message || 'Failed to fetch devices');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // New function to handle refresh with API call sequence
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const authToken = token || localStorage.getItem(config.AUTH.TOKEN_KEY);

      // First call the REFRESH_DEVICE_LIST API
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
        // If update was successful, fetch the updated list
        await fetchDevices();
      } else {
        throw new Error(refreshResult.message || 'Failed to update device list');
      }
    } catch (err) {
      setError(err.message);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [token]);

  return (
    <div className="space-y-8">
      {/* Network Overview Card */}
      {serviceInfo && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-xl">
          <div className="p-6">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white mr-4">
                  <FiWifi className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Network Overview</h2>
                  <p className="text-gray-500">{serviceInfo.wifiSSID}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className={`px-3 py-1 rounded-full mr-4 ${serviceInfo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  <span className="font-medium">{serviceInfo.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
                <button
                  onClick={handleRefresh} // Changed from fetchDevices to handleRefresh
                  disabled={isRefreshing}
                  className={`flex items-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all duration-300 transform hover:-translate-y-1 ${isRefreshing ? 'opacity-70' : ''}`}
                >
                  <FiRefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl transition-transform duration-300 transform hover:scale-105 group">
                <div className="flex items-center mb-3 text-blue-600">
                  <FiGlobe className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  <h3 className="font-semibold">IP Range</h3>
                </div>
                <p className="text-gray-800 font-medium">{serviceInfo.ipRange}</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 rounded-xl transition-transform duration-300 transform hover:scale-105 group">
                <div className="flex items-center mb-3 text-indigo-600">
                  <FiServer className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  <h3 className="font-semibold">Local IP</h3>
                </div>
                <p className="text-gray-800 font-medium">{serviceInfo.localIp}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl transition-transform duration-300 transform hover:scale-105 group">
                <div className="flex items-center mb-3 text-purple-600">
                  <FiGrid className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  <h3 className="font-semibold">Subnet Mask</h3>
                </div>
                <p className="text-gray-800 font-medium">{serviceInfo.subnetMask}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl transition-transform duration-300 transform hover:scale-105 group">
                <div className="flex items-center mb-3 text-amber-600">
                  <FiActivity className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                  <h3 className="font-semibold">Connected Devices</h3>
                </div>
                <p className="text-gray-800 font-medium">{serviceInfo.totalDevices}</p>
              </div>
            </div>

            {/* Last Synced Info */}
            <div className="mt-6 flex flex-col md:flex-row justify-between items-center bg-gray-50 rounded-lg p-3">
              <div className="flex items-center mb-3 md:mb-0">
                <FiClock className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Last updated: {serviceInfo.lastSynced.toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <FiShield className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Next sync: {serviceInfo.nextSync.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - with animation */}
      {loading && !isRefreshing && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
              <div className="h-16 w-16 rounded-full border-l-4 border-r-4 border-blue-300 animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-lg text-gray-600 mt-6 font-medium animate-pulse">Loading network data...</p>
          </div>
        </div>
      )}

      {/* Error State - with animation */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-fadeIn">
          <div className="flex items-center">
            <div className="rounded-full bg-red-100 p-3 mr-4">
              <FiAlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-1">Connection Error</h3>
              <p className="text-red-700">
                {error}
              </p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={fetchDevices}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Devices Table - with animations */}
      {!loading && !error && devices.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-xl">
          <div className="p-6 pb-0">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-green-100 mr-3">
                <FiServer className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Connected Devices</h2>
                <p className="text-gray-500">All devices currently connected to your network</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device, index) => (
                  <tr key={index} className={`hover:bg-blue-50 transition-colors duration-200 animate-fadeIn ${device.ip === serviceInfo.localIp ? 'bg-blue-50' : ''}`} style={{ animationDelay: `${index * 100}ms` }}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'} mr-3 animate-pulse`}></div>
                        <div className="text-sm font-medium text-gray-900">
                          {device.ip}
                          {device.ip === serviceInfo.localIp && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <FiMonitor className="mr-1" /> My Machine
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${device.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(device.lastSeen).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <button className="inline-flex items-center bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg mr-2 transition-all duration-200 hover:shadow-md">
                        <FiInfo className="mr-1" /> Details
                      </button>
                      {device.ip !== serviceInfo.localIp && (
                        <button className="inline-flex items-center bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded-lg transition-all duration-200 hover:shadow-md">
                          <FiXCircle className="mr-1" /> Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
            Showing {devices.length} of {serviceInfo?.totalDevices || 0} devices
          </div>
        </div>
      )}

      {/* Empty State - with animation */}
      {!loading && !error && devices.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center transition-all duration-300 hover:shadow-xl">
          <div className="inline-block p-4 rounded-full bg-gray-100 mb-4 animate-bounce">
            <FiWifi className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Connected Devices</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">No devices are currently connected to your network. Devices will appear here when they connect.</p>
          <button
            onClick={handleRefresh} // Changed from fetchDevices to handleRefresh
            className="inline-flex items-center bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors duration-300"
          >
            <FiRefreshCw className="mr-2" /> Check Again
          </button>
        </div>
      )}
    </div>
  );
}
