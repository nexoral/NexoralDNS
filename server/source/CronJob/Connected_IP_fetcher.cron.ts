// Get Current WAN IP
import getLocalIPRange from "../utilities/GetWLANIP.utls";
import { Retry } from "outers";
import { pingIP } from "../helper/IP_Ping.helper";
import { DB_DEFAULT_CONFIGS } from "../core/key";
import { getCollectionClient } from "../Database/mongodb.db";



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
export default async function fetchConnectedIP(): Promise<void> {
  Retry.Hours(async () => {
    const availableIPs: object[] = [];
    const currentIP = getLocalIPRange("any");
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
                availableIPs.push({ ip: ipAddress, status: "reachable", lastSeen: new Date() });
                console.log(`IP ${ipAddress} is reachable.`);
              }
            })
          );
        }
        await Promise.all(batch); // wait for this batch to finish
      }

      const update_Fields = {
        List_of_Connected_Devices_Info: availableIPs,
        Total_Connected_Devices_To_Router: availableIPs.length,
        Connected_At: new Date(),
        Next_Expected_Sync_At: new Date(Date.now() + 60 * 60 * 1000), // +1 hour
        Last_Synced_At: new Date()
      }
      await serviceCol?.updateOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME }, { $set: update_Fields });
      console.log(`Connected IPs updated with status: ${availableIPs.length} devices found.`);
    }
  }, 1, true);
}
