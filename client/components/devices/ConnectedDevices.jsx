'use client';

import { useEffect, useState } from 'react';
import {
  FiRefreshCw, FiInfo, FiXCircle, FiWifi, FiClock,
  FiServer, FiAlertCircle, FiGlobe, FiActivity,
  FiShield, FiGrid, FiMonitor, FiCheckCircle
} from 'react-icons/fi';
import { api } from '../../services/api';
import BlockDeviceModal from './BlockDeviceModal';

export default function ConnectedDevices() {
  const [devices, setDevices] = useState([]);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Blocking Feature State
  const [policies, setPolicies] = useState([]);
  const [ipGroups, setIpGroups] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Function to fetch the list of devices
  const fetchDevices = async () => {
    setLoading(true);
    try {
      const [deviceResponse, policiesResponse, ipGroupsResponse] = await Promise.all([
        api.getDeviceList(),
        api.getAccessControlPolicies(),
        api.getIPGroups()
      ]);

      const result = deviceResponse.data;

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

      setPolicies(policiesResponse.data.data.policies || []);
      setIpGroups(ipGroupsResponse.data.data.groups || []);

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
      const refreshResponse = await api.refreshDeviceList();
      const refreshResult = refreshResponse.data;

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
  }, []);

  // Check if a device is blocked by any active policy
  const isDeviceBlocked = (ip) => {
    return policies.some(policy => {
      if (!policy.isActive) return false;

      // Check target type
      if (policy.targetType === 'all') return true;
      if (policy.targetType === 'single_ip' && policy.targetIP === ip) return true;
      if (policy.targetType === 'multiple_ips' && policy.targetIPs?.includes(ip)) return true;

      // Check IP Groups
      if (policy.targetType === 'ip_group') {
        const group = ipGroups.find(g => g._id === policy.targetIPGroup);
        if (group && group.ipAddresses.includes(ip)) return true;
      }

      if (policy.targetType === 'multiple_ip_groups') {
        return policy.targetIPGroups?.some(groupId => {
          const group = ipGroups.find(g => g._id === groupId);
          return group && group.ipAddresses.includes(ip);
        });
      }

      return false;
    });
  };

  const handleBlockClick = (device) => {
    setSelectedDevice(device);
    setShowBlockModal(true);
  };

  const handleBlockConfirm = async (policyData) => {
    try {
      await api.createAccessControlPolicy(policyData);
      setShowBlockModal(false);
      setSelectedDevice(null);
      // Refresh policies to update UI
      fetchDevices();
    } catch (error) {
      console.error('Failed to create policy:', error);
      // You might want to show an error toast here
    }
  };

  return (
    <div className="space-y-8">
      {/* Network Overview Card */}
      {serviceInfo && (
        <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] overflow-hidden">
          <div className="p-6">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="p-3 rounded-lg bg-[rgba(91,140,255,0.12)] border border-[rgba(91,140,255,0.2)] mr-4">
                  <FiWifi className="h-6 w-6 text-[#5b8cff]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#e7eef6]">Network Overview</h2>
                  <p className="text-[#7c8aa0]">{serviceInfo.wifiSSID}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  serviceInfo.status === 'active'
                    ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84] border-[rgba(61,220,132,0.25)]'
                    : 'bg-[rgba(255,96,113,0.12)] text-[#ff6071] border-[rgba(255,96,113,0.25)]'
                }`}>
                  {serviceInfo.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`flex items-center bg-[rgba(91,140,255,0.08)] text-[#5b8cff] hover:bg-[rgba(91,140,255,0.15)] border border-[rgba(91,140,255,0.2)] px-4 py-2 rounded-lg transition-all duration-200 ${isRefreshing ? 'opacity-70' : ''}`}
                >
                  <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[rgba(91,140,255,0.08)] border border-[rgba(91,140,255,0.18)] p-5 rounded-xl hover:bg-[rgba(91,140,255,0.12)] transition-colors duration-200">
                <div className="flex items-center mb-3 text-[#5b8cff]">
                  <FiGlobe className="h-4 w-4 mr-2" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">IP Range</h3>
                </div>
                <p className="text-[#5b8cff] font-bold font-mono text-sm">{serviceInfo.ipRange}</p>
              </div>

              <div className="bg-[rgba(52,225,212,0.08)] border border-[rgba(52,225,212,0.18)] p-5 rounded-xl hover:bg-[rgba(52,225,212,0.12)] transition-colors duration-200">
                <div className="flex items-center mb-3 text-[#34e1d4]">
                  <FiServer className="h-4 w-4 mr-2" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">My Local IP</h3>
                </div>
                <p className="text-[#34e1d4] font-bold font-mono text-sm">{serviceInfo.localIp}</p>
              </div>

              <div className="bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.18)] p-5 rounded-xl hover:bg-[rgba(167,139,250,0.12)] transition-colors duration-200">
                <div className="flex items-center mb-3 text-[#a78bfa]">
                  <FiGrid className="h-4 w-4 mr-2" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">Subnet Mask</h3>
                </div>
                <p className="text-[#a78bfa] font-bold font-mono text-sm">{serviceInfo.subnetMask}</p>
              </div>

              <div className="bg-[rgba(61,220,132,0.08)] border border-[rgba(61,220,132,0.18)] p-5 rounded-xl hover:bg-[rgba(61,220,132,0.12)] transition-colors duration-200">
                <div className="flex items-center mb-3 text-[#3ddc84]">
                  <FiActivity className="h-4 w-4 mr-2" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">Connected Devices</h3>
                </div>
                <p className="text-[#3ddc84] font-bold font-mono text-sm">{serviceInfo.totalDevices}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col md:flex-row justify-between items-center bg-white/4 border border-[rgba(130,165,220,0.08)] rounded-lg p-3">
              <div className="flex items-center mb-3 md:mb-0">
                <FiClock className="text-[#7c8aa0] mr-2 h-3.5 w-3.5" />
                <span className="text-sm text-[#9aa8bd]">Last updated: {serviceInfo.lastSynced.toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <FiShield className="text-[#7c8aa0] mr-2 h-3.5 w-3.5" />
                <span className="text-sm text-[#9aa8bd]">Next sync: {serviceInfo.nextSync.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State - with animation */}
      {loading && !isRefreshing && (
        <div className="bg-[#0d111a] rounded-xl shadow-lg border border-[rgba(130,165,220,0.14)] p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
              <div className="h-16 w-16 rounded-full border-l-4 border-r-4 border-blue-300 animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-lg text-[#9aa8bd] mt-6 font-medium animate-pulse">Loading network data...</p>
          </div>
        </div>
      )}

      {/* Error State - with animation */}
      {error && (
        <div className="bg-[rgba(255,96,113,0.07)] border border-red-200 rounded-xl p-6 animate-fadeIn">
          <div className="flex items-center">
            <div className="rounded-full bg-[rgba(255,96,113,0.12)] p-3 mr-4">
              <FiAlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#ff6071] mb-1">Connection Error</h3>
              <p className="text-[#ff6071]">
                {error}
              </p>
            </div>
          </div>
          <div className="mt-4 text-right">
            <button
              onClick={fetchDevices}
              className="bg-[rgba(255,96,113,0.12)] hover:bg-red-200 text-[#ff6071] px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Devices Table - with animations */}
      {!loading && !error && devices.length > 0 && (
        <div className="bg-[#0d111a] rounded-xl shadow-lg border border-[rgba(130,165,220,0.14)] overflow-hidden transition-all duration-500 hover:shadow-xl">
          <div className="p-6 pb-0">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-[rgba(61,220,132,0.12)] mr-3">
                <FiServer className="h-5 w-5 text-[#3ddc84]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#e7eef6]">Connected Devices</h2>
                <p className="text-[#7c8aa0]">All devices currently connected to your network</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[rgba(130,165,220,0.08)]">
              <thead className="bg-white/3">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7c8aa0] uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7c8aa0] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7c8aa0] uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7c8aa0] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#0d111a] divide-y divide-[rgba(130,165,220,0.08)]">
                {devices.map((device, index) => {
                  const isBlocked = isDeviceBlocked(device.ip);
                  return (
                    <tr key={index} className={`hover:bg-[rgba(91,140,255,0.07)] transition-colors duration-200 animate-fadeIn ${device.ip === serviceInfo.localIp ? 'bg-[rgba(91,140,255,0.07)]' : ''}`} style={{ animationDelay: `${index * 100}ms` }}>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${device.status === 'connected' ? 'bg-green-500' : 'bg-red-500'} mr-3 animate-pulse`}></div>
                          <div className="text-sm font-medium text-[#e7eef6]">
                            {device.ip}
                            {device.ip === serviceInfo.localIp && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[rgba(91,140,255,0.12)] text-[#5b8cff]">
                                <FiMonitor className="mr-1" /> My Machine
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${device.status === 'connected' ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84]' : 'bg-[rgba(255,96,113,0.12)] text-[#ff6071]'
                          }`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-[#7c8aa0]">{new Date(device.lastSeen).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                        {device.ip !== serviceInfo.localIp && (
                          isBlocked ? (
                            <span className="inline-flex items-center bg-white/8 text-[#7c8aa0] px-3 py-1 rounded-lg cursor-not-allowed">
                              <FiShield className="mr-1" /> Blocked By Policy
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBlockClick(device)}
                              className="inline-flex items-center bg-[rgba(255,96,113,0.07)] text-[#ff6071] hover:bg-[rgba(255,96,113,0.12)] px-3 py-1 rounded-lg transition-all duration-200 hover:shadow-md"
                            >
                              <FiXCircle className="mr-1" /> Block
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-white/3 text-center text-sm text-[#7c8aa0]">
            Showing {devices.length} of {serviceInfo?.totalDevices || 0} devices
          </div>
        </div>
      )}

      {/* Empty State - with animation */}
      {!loading && !error && devices.length === 0 && (
        <div className="bg-[#0d111a] rounded-xl shadow-lg border border-[rgba(130,165,220,0.14)] p-12 text-center transition-all duration-300 hover:shadow-xl">
          <div className="inline-block p-4 rounded-full bg-white/8 mb-4 animate-bounce">
            <FiWifi className="h-8 w-8 text-[#7c8aa0]" />
          </div>
          <h3 className="text-xl font-semibold text-[#e7eef6] mb-2">No Connected Devices</h3>
          <p className="text-[#7c8aa0] mb-6 max-w-md mx-auto">No devices are currently connected to your network. Devices will appear here when they connect.</p>
          <button
            onClick={handleRefresh} // Changed from fetchDevices to handleRefresh
            className="inline-flex items-center bg-[rgba(91,140,255,0.12)] hover:bg-[rgba(91,140,255,0.15)] text-[#5b8cff] px-4 py-2 rounded-lg transition-colors duration-300"
          >
            <FiRefreshCw className="mr-2" /> Check Again
          </button>
        </div>
      )}

      {/* Block Device Modal */}
      {showBlockModal && selectedDevice && (
        <BlockDeviceModal
          deviceIP={selectedDevice.ip}
          onClose={() => setShowBlockModal(false)}
          onSave={handleBlockConfirm}
        />
      )}
    </div>
  );
}
