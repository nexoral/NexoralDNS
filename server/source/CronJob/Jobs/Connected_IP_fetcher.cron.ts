import logger from '../../utilities/logger';
import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { exec } from "child_process";
import { readFile } from "fs/promises";
import { networkInterfaces } from "os";
import { reverse } from "dns/promises";
import getLocalIPRange from "../../utilities/GetWLANIP.utls";
import { Retry } from "outers";
import { pingIP } from "../../helper/IP_Ping.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { promisify } from "util";

interface ARPEntry {
  ip: string;
  mac: string;
  flags: string;
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
}

function numberToIP(num: number): string {
  return [
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ].join(".");
}

export async function getWiFiSSID(): Promise<string | null> {
  const execAsync = promisify(exec);
  try {
    const command = `iwgetid -r`;
    const { stdout } = await execAsync(command);
    return stdout.trim() || null;
  } catch (error) {
    logger.error("Error fetching SSID:", error);
    return null;
  }
}

export async function getARPTable(): Promise<Map<string, ARPEntry>> {
  const arpMap = new Map<string, ARPEntry>();
  try {
    const arpContent = await readFile("/proc/net/arp", "utf-8");
    const lines = arpContent.split("\n");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length >= 6) {
        const entry: ARPEntry = {
          ip: parts[0],
          flags: parts[2],
          mac: parts[3],
        };
        arpMap.set(entry.ip, entry);
      }
    }

    // Add own machine's MAC if not already in ARP table
    const currentIP = getLocalIPRange("any");
    const ownMachine = await getOwnMachineInfo(currentIP.ip);
    if (ownMachine.ip !== "unknown" && !arpMap.has(ownMachine.ip)) {
      arpMap.set(ownMachine.ip, {
        ip: ownMachine.ip,
        mac: ownMachine.mac,
        flags: "own",
      });
    }
  } catch (error) {
    logger.error("Error reading ARP table:", error);
  }
  return arpMap;
}

export async function getOwnMachineInfo(targetIP: string): Promise<{ ip: string; mac: string }> {
  try {
    const interfaces = networkInterfaces();

    for (const interfaceData of Object.values(interfaces)) {
      if (!interfaceData) continue;

      for (const iface of interfaceData) {
        if (iface.family === "IPv4" && !iface.internal) {
          if (iface.address === targetIP) {
            return {
              ip: iface.address,
              mac: iface.mac,
            };
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error getting own machine info:", error);
  }

  return {
    ip: "unknown",
    mac: "unknown",
  };
}

export async function getDNSHostnames(ipList: string[]): Promise<Map<string, string>> {
  const hostnameMap = new Map<string, string>();

  const dnsLookups = ipList.map(async (ip) => {
    try {
      const hostnames = await reverse(ip);
      if (hostnames && hostnames.length > 0) {
        hostnameMap.set(ip, hostnames[0]);
      }
    } catch (error) {
      // DNS lookup failed, skip this IP
    }
  });

  await Promise.all(dnsLookups);
  return hostnameMap;
}

export async function fetchConnectedIP(): Promise<Boolean> {
  const connectedIPList: string[] = [];
  const currentIP = getLocalIPRange("any");
  const SSID = await getWiFiSSID();

  const serviceCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
  const serviceConfig = await serviceCol?.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });

  if (currentIP && serviceConfig) {
    const minNum = ipToNumber(currentIP.minIP);
    const maxNum = ipToNumber(currentIP.maxIP);
    const batchSize = 100;

    // Step 1: Ping all IPs in batches
    for (let batchStart = minNum; batchStart <= maxNum; batchStart += batchSize) {
      const batch = [];
      for (let i = batchStart; i < batchStart + batchSize && i <= maxNum; i++) {
        const ipAddress = numberToIP(i);
        batch.push(
          pingIP(ipAddress).then((pingResult) => {
            if (pingResult) {
              connectedIPList.push(ipAddress);
            }
          })
        );
      }
      await Promise.all(batch);
    }

    // Step 2: DNS lookup for connected IPs only
    const hostnameMap = await getDNSHostnames(connectedIPList);

    // Step 3: Poll ARP table with smart resolution
    let arpTable = await getARPTable();
    const maxRetries = 8;
    const pollInterval = 150;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const resolved = connectedIPList.filter(ip => {
        const entry = arpTable.get(ip);
        return entry && entry.mac !== "unknown" && entry.mac !== "00:00:00:00:00:00";
      });
      const unresolved = connectedIPList.filter(ip => !resolved.includes(ip));

      if (unresolved.length === 0) {
        break;
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        arpTable = await getARPTable();
      }
    }

    // Step 4: Build device list from connected IPs, DNS, and ARP table
    const availableIPs: object[] = [];

    for (const ipAddress of connectedIPList) {
      const arpEntry = arpTable.get(ipAddress);
      const hostname = hostnameMap.get(ipAddress);

      availableIPs.push({
        ip: ipAddress,
        mac: arpEntry?.mac || "unknown",
        hostname: hostname,
        status: "connected",
        lastSeen: Date.now(),
      });
    }

    const update_Fields = {
      Current_WiFi_SSID: SSID,
      Current_Local_IP: currentIP.ip,
      Current_Subnet_Mask: currentIP.subnetMask,
      Current_IP_Range: `${currentIP.minIP} - ${currentIP.maxIP}`,
      List_of_Connected_Devices_Info: availableIPs,
      Total_Connected_Devices_To_Router: availableIPs.length,
      Connected_At: Date.now(),
      Next_Expected_Sync_At: new Date(Date.now() + 60 * 1000),
      Last_Synced_At: Date.now()
    };

    await serviceCol?.updateOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME }, { $set: update_Fields });
    return true;
  }

  return false;
}

export const IpConnectionCronJob = async () => {
  Retry.Minutes(async () => {
    await fetchConnectedIP();
  }, 2, true);
};
