import os from "os";

interface IPRange {
  ip: string;
  minIP: string;
  maxIP: string;
  subnetMask: string;
}

export default function getLocalIPRange(
  preferred: "wifi" | "lan" | "any" = "any"
): IPRange {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;

    for (const net of netList) {
      if (net.family === "IPv4" && !net.internal) {
        // Match preferred type
        const lname = name.toLowerCase();
        if (
          preferred === "wifi" &&
          !(lname.includes("wlan") || lname.includes("wi-fi"))
        ) {
          continue;
        }
        if (preferred === "lan" && !(lname.includes("eth") || lname.includes("enp"))) {
          continue;
        }

        const ipParts = net.address.split(".").map(Number);
        const maskParts = net.netmask.split(".").map(Number);

        // Network address (IP & mask)
        const network = ipParts.map((p, i) => p & maskParts[i]);

        // Broadcast address (IP | ~mask)
        const broadcast = ipParts.map((p, i) => p | (~maskParts[i] & 255));

        // Min usable = network + 1
        const minIP = [...network];
        minIP[3] += 1;

        // Max usable = broadcast - 1
        const maxIP = [...broadcast];
        maxIP[3] -= 1;

        return {
          ip: net.address,
          minIP: minIP.join("."),
          maxIP: maxIP.join("."),
          subnetMask: net.netmask,
        };
      }
    }
  }

  // fallback
  return {
    ip: "127.0.0.1",
    minIP: "127.0.0.1",
    maxIP: "127.0.0.1",
    subnetMask: "255.0.0.0",
  };
}
