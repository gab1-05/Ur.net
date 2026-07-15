export interface ParsedInterface {
  name: string;
  displayName: string | null;
  state: "up" | "down" | "unknown";
  ipv4: string | null;
  ipv6: string | null;
  mac: string | null;
  gateway: string | null;
  netmask: string | null;
  type: string | null;
  mtu: number | null;
  rx: number | null;
  tx: number | null;
}

// Use Node.js built-in os module for interface info (cross-platform)
import os from "os";

export function getInterfacesFromOS(): ParsedInterface[] {
  const netInterfaces = os.networkInterfaces();
  const results: ParsedInterface[] = [];

  for (const [name, addrs] of Object.entries(netInterfaces)) {
    if (!addrs || addrs.length === 0) continue;

    let ipv4: string | null = null;
    let ipv6: string | null = null;
    let mac: string | null = null;
    let netmask: string | null = null;

    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        ipv4 = addr.address;
        netmask = addr.netmask;
        mac = addr.mac !== "00:00:00:00:00:00" ? addr.mac : null;
      }
      if (addr.family === "IPv6" && !addr.internal && !addr.address.startsWith("fe80")) {
        ipv6 = addr.address;
      }
      if (!mac && addr.mac && addr.mac !== "00:00:00:00:00:00") {
        mac = addr.mac;
      }
    }

    // Determine if the interface has any non-internal addresses
    const hasAddr = addrs.some(a => !a.internal);
    const state: "up" | "down" | "unknown" = hasAddr ? "up" : "unknown";

    results.push({
      name,
      displayName: name,
      state,
      ipv4,
      ipv6,
      mac,
      gateway: null, // Gateway requires routing table, not available from os module alone
      netmask,
      type: name.startsWith("lo") || name === "Loopback" ? "loopback"
          : name.startsWith("eth") || name.startsWith("en") ? "ethernet"
          : name.startsWith("wl") || name.startsWith("Wi-Fi") ? "wifi"
          : "unknown",
      mtu: null,
      rx: null,
      tx: null,
    });
  }

  // Add loopback last
  const loopback = Object.entries(netInterfaces).find(([name]) => name.startsWith("lo") || name === "lo0");
  if (loopback) {
    const [name, addrs] = loopback;
    if (addrs && !results.find(r => r.name === name)) {
      results.push({
        name,
        displayName: "Loopback",
        state: "up",
        ipv4: "127.0.0.1",
        ipv6: "::1",
        mac: null,
        gateway: null,
        netmask: "255.0.0.0",
        type: "loopback",
        mtu: null,
        rx: null,
        tx: null,
      });
    }
  }

  return results;
}
