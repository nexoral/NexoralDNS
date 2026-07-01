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
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[var(--blue)] border-t-transparent mb-3"></div>
          <p className="text-[var(--text-3)] text-sm">Loading network data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
        <h2 className="text-base font-semibold text-[var(--text-1)] mb-4">Network Overview</h2>
        <div className="bg-[rgba(255,96,113,0.08)] border-l-4 border-[var(--red)] p-4 rounded-md">
          <p className="text-sm text-[var(--red)]">{error}</p>
          <button onClick={fetchNetworkData} className="mt-2 text-sm text-[var(--red)] font-medium underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!networkData) return null;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-2)] p-6">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-[rgba(91,140,255,0.12)] mr-3">
            <FiWifi className="h-4 w-4 text-[var(--blue)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">Network Overview</h2>
            <p className="text-xs text-[var(--text-3)]">{networkData.wifiSSID}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
            networkData.status === 'active'
              ? 'bg-[rgba(61,220,132,0.12)] text-[var(--green)] border-[rgba(61,220,132,0.25)]'
              : 'bg-[rgba(255,96,113,0.12)] text-[var(--red)] border-[rgba(255,96,113,0.25)]'
          }`}>
            {networkData.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-[var(--blue)] hover:text-[var(--teal)] flex items-center text-sm transition-colors"
          >
            <FiRefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-4 bg-[rgba(91,140,255,0.08)] rounded-xl border border-[rgba(91,140,255,0.18)]">
          <div className="flex items-center mb-2 text-[var(--blue)]">
            <FiGlobe className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">IP Range</span>
          </div>
          <p className="text-sm font-bold text-[var(--blue)] font-mono">{networkData.ipRange}</p>
        </div>

        <div className="p-4 bg-[rgba(52,225,212,0.08)] rounded-xl border border-[rgba(52,225,212,0.18)]">
          <div className="flex items-center mb-2 text-[var(--teal)]">
            <FiServer className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">My Local IP</span>
          </div>
          <p className="text-sm font-bold text-[var(--teal)] font-mono">{networkData.localIp}</p>
        </div>

        <div className="p-4 bg-[rgba(167,139,250,0.08)] rounded-xl border border-[rgba(167,139,250,0.18)]">
          <div className="flex items-center mb-2 text-[var(--purple)]">
            <FiGrid className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Subnet Mask</span>
          </div>
          <p className="text-sm font-bold text-[var(--purple)] font-mono">{networkData.subnetMask}</p>
        </div>

        <div className="p-4 bg-[rgba(61,220,132,0.08)] rounded-xl border border-[rgba(61,220,132,0.18)]">
          <div className="flex items-center mb-2 text-[var(--green)]">
            <FiActivity className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Connected Devices</span>
          </div>
          <p className="text-sm font-bold text-[var(--green)] font-mono">{networkData.totalDevices}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between text-xs text-[var(--text-5)] pt-3 border-t border-[var(--border)]">
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
