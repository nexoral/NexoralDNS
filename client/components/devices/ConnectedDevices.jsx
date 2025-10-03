'use client';

import { useEffect, useState } from 'react';
import useAuthStore from '../../stores/authStore';
import config, { getApiUrl } from '../../config/keys';
import { FiRefreshCw, FiInfo, FiXCircle, FiWifi, FiClock, FiServer, FiAlertCircle } from 'react-icons/fi';

export default function ConnectedDevices() {
  const [devices, setDevices] = useState([]);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuthStore();

  const fetchDevices = async () => {
    setLoading(true);
    try {
      // Get token from Zustand store or fallback to localStorage for compatibility
      const authToken = token || localStorage.getItem(config.AUTH.TOKEN_KEY);

      const response = await fetch(getApiUrl('LIST_OF_DEVICES') || 'http://localhost:4773/api/dhcp/list-of-available-ips', {
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
          totalDevices: result.data.Total_Connected_Devices_To_Router
        });
      } else {
        throw new Error(result.message || 'Failed to fetch devices');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Service Info Card */}
      {serviceInfo && (
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-50 mr-3">
                  <FiServer className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Network Status</h2>
              </div>
              <button
                onClick={fetchDevices}
                className="flex items-center bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-md transition-colors"
              >
                <FiRefreshCw className="mr-2" /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiWifi className="text-blue-500 mr-2" />
                  <h3 className="text-sm font-medium text-blue-800">Service</h3>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">{serviceInfo.serviceName}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${serviceInfo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {serviceInfo.status}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiServer className="text-purple-500 mr-2" />
                  <h3 className="text-sm font-medium text-purple-800">Total Devices</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{serviceInfo.totalDevices}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiClock className="text-green-500 mr-2" />
                  <h3 className="text-sm font-medium text-green-800">Last Updated</h3>
                </div>
                <p className="text-sm font-medium text-gray-700">{serviceInfo.lastSynced.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiClock className="text-amber-500 mr-2" />
                  <h3 className="text-sm font-medium text-amber-800">Next Update</h3>
                </div>
                <p className="text-sm font-medium text-gray-700">{serviceInfo.nextSync.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-10 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3"></div>
          <p className="text-gray-600">Loading connected devices...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center">
            <FiAlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700 font-medium">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Devices Table */}
      {!loading && !error && devices.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connected Devices</h2>
            <p className="text-gray-600 mb-4">All devices currently connected to your network</p>
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
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{device.ip}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${device.status === 'reachable' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(device.lastSeen).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                      <button className="inline-flex items-center bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded mr-2">
                        <FiInfo className="mr-1" /> Details
                      </button>
                      <button className="inline-flex items-center bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 rounded">
                        <FiXCircle className="mr-1" /> Block
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && devices.length === 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-10 text-center">
          <div className="inline-block p-3 rounded-full bg-gray-100 mb-3">
            <FiWifi className="h-6 w-6 text-gray-500" />
          </div>
          <p className="text-lg font-medium text-gray-700 mb-1">No Connected Devices</p>
          <p className="text-gray-500">No devices are currently connected to your network.</p>
        </div>
      )}
    </div>
  );
}
