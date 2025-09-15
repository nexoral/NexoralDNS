import os from "os";

/**
 * Get the local IP address of the machine.
 * @param preferred - Preferred network interface type: "wifi", "lan", or "any".
 * @returns The local IP address as a string.
 */
export default function getLocalIP(preferred: "wifi" | "lan" | "any" = "any"): string {
  const nets = os.networkInterfaces();
  const results: Record<string, string[]> = {};

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;

    for (const net of netList) {
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) results[name] = [];
        results[name].push(net.address);
      }
    }
  }

  // Try to pick based on preferred interface type
  if (preferred === "wifi") {
    for (const name of Object.keys(results)) {
      if (name.toLowerCase().includes("wlan") || name.toLowerCase().includes("wi-fi")) {
        return results[name][0];
      }
    }
  }

  if (preferred === "lan") {
    for (const name of Object.keys(results)) {
      if (name.toLowerCase().includes("eth") || name.toLowerCase().includes("enp")) {
        return results[name][0];
      }
    }
  }

  // Fallback: first available non-internal IPv4
  for (const addrs of Object.values(results)) {
    if (addrs.length > 0) return addrs[0];
  }

  return "127.0.0.1"; // last fallback
}
