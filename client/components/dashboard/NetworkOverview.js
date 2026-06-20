'use client';

import { useState, useEffect } from 'react';
import { FiRefreshCw, FiWifi, FiGlobe, FiServer, FiGrid, FiActivity, FiClock, FiShield } from 'react-icons/fi';
import { api } from '../../services/api';

export default function NetworkOverview() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNetworkData = async () => {
    try {
      const response = await api.getDeviceList();
      const result = response.data;
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
      const refreshResponse = await api.refreshDeviceList();
      const refreshResult = refreshResponse.data;
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
  }, []);

  if (loading && !networkData) {
    return (
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#5b8cff] border-t-transparent mb-3"></div>
          <p className="text-[#9aa8bd] text-sm">Loading network data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
        <h2 className="text-base font-semibold text-[#e7eef6] mb-4">Network Overview</h2>
        <div className="bg-[rgba(255,96,113,0.08)] border-l-4 border-[#ff6071] p-4 rounded-md">
          <p className="text-sm text-[#ff6071]">{error}</p>
          <button onClick={fetchNetworkData} className="mt-2 text-sm text-[#ff6071] font-medium underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!networkData) return null;

  return (
    <div className="bg-[#0d111a] rounded-xl border border-[rgba(130,165,220,0.14)] p-6">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-[rgba(91,140,255,0.12)] mr-3">
            <FiWifi className="h-4 w-4 text-[#5b8cff]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#e7eef6]">Network Overview</h2>
            <p className="text-xs text-[#9aa8bd]">{networkData.wifiSSID}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
            networkData.status === 'active'
              ? 'bg-[rgba(61,220,132,0.12)] text-[#3ddc84] border-[rgba(61,220,132,0.25)]'
              : 'bg-[rgba(255,96,113,0.12)] text-[#ff6071] border-[rgba(255,96,113,0.25)]'
          }`}>
            {networkData.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-[#5b8cff] hover:text-[#34e1d4] flex items-center text-sm transition-colors"
          >
            <FiRefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-4 bg-[rgba(91,140,255,0.08)] rounded-xl border border-[rgba(91,140,255,0.18)]">
          <div className="flex items-center mb-2 text-[#5b8cff]">
            <FiGlobe className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">IP Range</span>
          </div>
          <p className="text-sm font-bold text-[#5b8cff] font-mono">{networkData.ipRange}</p>
        </div>

        <div className="p-4 bg-[rgba(52,225,212,0.08)] rounded-xl border border-[rgba(52,225,212,0.18)]">
          <div className="flex items-center mb-2 text-[#34e1d4]">
            <FiServer className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">My Local IP</span>
          </div>
          <p className="text-sm font-bold text-[#34e1d4] font-mono">{networkData.localIp}</p>
        </div>

        <div className="p-4 bg-[rgba(167,139,250,0.08)] rounded-xl border border-[rgba(167,139,250,0.18)]">
          <div className="flex items-center mb-2 text-[#a78bfa]">
            <FiGrid className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Subnet Mask</span>
          </div>
          <p className="text-sm font-bold text-[#a78bfa] font-mono">{networkData.subnetMask}</p>
        </div>

        <div className="p-4 bg-[rgba(61,220,132,0.08)] rounded-xl border border-[rgba(61,220,132,0.18)]">
          <div className="flex items-center mb-2 text-[#3ddc84]">
            <FiActivity className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Connected Devices</span>
          </div>
          <p className="text-sm font-bold text-[#3ddc84] font-mono">{networkData.totalDevices}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between text-xs text-[#7c8aa0] pt-3 border-t border-[rgba(130,165,220,0.08)]">
        <div className="flex items-center mb-2 sm:mb-0">
          <FiClock className="mr-1.5 h-3.5 w-3.5" />
          Last updated: {networkData.lastSynced.toLocaleString()}
        </div>
        <div className="flex items-center">
          <FiShield className="mr-1.5 h-3.5 w-3.5" />
          Next sync: {networkData.nextSync.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
