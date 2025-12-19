import { exec } from "child_process";
// Get Current WAN IP
import getLocalIPRange from "../../utilities/GetWLANIP.utls";
import { Retry } from "outers";
import { pingIP } from "../../helper/IP_Ping.helper";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { promisify } from "util";



function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
}


/**
 * Converts a numeric representation of an IP address to its dotted decimal notation.
 * 
 * This function takes a 32-bit integer representation of an IPv4 address and
 * converts it to the standard dotted decimal format (e.g., "192.168.0.1").
 * 
 * @param num - A 32-bit integer representing an IPv4 address
 * @returns The IP address in dotted decimal notation (e.g., "192.168.0.1")
 * 
 * @example
 * // Returns "192.168.0.1"
 * numberToIP(3232235521);
 */
function numberToIP(num: number): string {
  return [
    (num >> 24) & 255,
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
  ].join(".");
}



/**
 * Get the current WiFi SSID using nmcli (Linux only).
 */
 
export async function getWiFiSSID(): Promise<string | null> {
  const execAsync = promisify(exec);
  try {
    const command = `iwgetid -r`;
    const { stdout } = await execAsync(command);
    return stdout.trim() || null;
  } catch (error) {
    console.error("Error fetching SSID:", error);
    return null;
  }
}


/**
 * Fetches and pings all IP addresses within the local IP range.
 * 
 * This function runs on a schedule, executing once every hour. For each IP address
 * in the local network range, it performs a ping operation and logs whether the IP
 * is reachable or not.
 * 
 * @returns A Promise that resolves when the current execution cycle completes
 * @example
 * // Schedule the IP scanning job
 * await fetchConnectedIP();
 */
export async function fetchConnectedIP(): Promise<Boolean> {
    const availableIPs: object[] = [];
    const currentIP = getLocalIPRange("any");
    const  SSID = await getWiFiSSID();
    console.log(`Current SSID: ${SSID}`);
    console.log(`Scanning IP range: ${currentIP.minIP} - ${currentIP.maxIP}`);
    // Fetch service config to update connected IPs
    const serviceCol = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    const serviceConfig = await serviceCol?.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
    if (currentIP && serviceConfig) {
      const minNum = ipToNumber(currentIP.minIP);
      const maxNum = ipToNumber(currentIP.maxIP);
      const batchSize = 100;

      for (let batchStart = minNum; batchStart <= maxNum; batchStart += batchSize) {
        const batch = [];
        for (let i = batchStart; i < batchStart + batchSize && i <= maxNum; i++) {
          const ipAddress = numberToIP(i);
          batch.push(
            pingIP(ipAddress).then((pingResult) => {
              if (pingResult) {
                availableIPs.push({ ip: ipAddress, status: "connected", lastSeen: Date.now() });
                console.log(`IP ${ipAddress} is connected.`);
              }
            })
          );
        }
        await Promise.all(batch); // wait for this batch to finish
      }

      const update_Fields = {
        Current_WiFi_SSID: SSID,
        Current_Local_IP: currentIP.ip,
        Current_Subnet_Mask: currentIP.subnetMask,
        Current_IP_Range: `${currentIP.minIP} - ${currentIP.maxIP}`,
        List_of_Connected_Devices_Info: availableIPs,
        Total_Connected_Devices_To_Router: availableIPs.length,
        Connected_At: Date.now(),
        Next_Expected_Sync_At: new Date(Date.now() + 60 * 1000), // +1 minute
        Last_Synced_At: Date.now()
      }
      await serviceCol?.updateOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME }, { $set: update_Fields });
      console.log(`Connected IPs updated with status: ${availableIPs.length} devices found.`);
      return true;
    }
    else {
      console.log("Could not determine local IP range or service config missing.");
      return false;
    }
};

export const IpConnectionCronJob = async () => {
  Retry.Minutes(async () => {
    await fetchConnectedIP();
  }, 2, true);
}