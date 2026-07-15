export interface RouteHop {
  hop: number;
  host: string | null;
  ip: string | null;
  rtt1: number | null;
  rtt2: number | null;
  rtt3: number | null;
  timeout: boolean;
}

export interface TracerouteParseResult {
  success: boolean;
  hops: RouteHop[];
  hopCount: number;
  summary: string;
  warnings: string[];
}

// Parse a Unix traceroute line: " 1  router.local (192.168.1.1)  1.234 ms  1.345 ms  1.456 ms"
const UNIX_HOP_RE = /^\s*(\d+)\s+(.*?)\s+(\d+\.\d+)\s+ms(?:\s+([\d.]+)\s+ms)?(?:\s+([\d.]+)\s+ms)?/;
const TIMEOUT_RE = /^\s*(\d+)\s+\*\s*\*\s*\*/;
// Hostname + IP: "hostname (x.x.x.x)"
const HOST_IP_RE = /^(.*?)\s+\(([\d.a-fA-F:]+)\)$/;

function parseUnixTraceroute(raw: string): TracerouteParseResult {
  const lines = raw.split("\n");
  const hops: RouteHop[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const timeoutMatch = line.match(TIMEOUT_RE);
    if (timeoutMatch) {
      hops.push({ hop: parseInt(timeoutMatch[1]), host: null, ip: null, rtt1: null, rtt2: null, rtt3: null, timeout: true });
      continue;
    }
    const hopMatch = line.match(UNIX_HOP_RE);
    if (hopMatch) {
      const hopNum = parseInt(hopMatch[1]);
      const hostPart = hopMatch[2].trim();
      let host: string | null = null;
      let ip: string | null = null;
      const hostIpMatch = hostPart.match(HOST_IP_RE);
      if (hostIpMatch) {
        host = hostIpMatch[1].trim() || null;
        ip = hostIpMatch[2];
      } else {
        // Could be just an IP or just a hostname
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostPart) || /[0-9a-fA-F:]+:[0-9a-fA-F:]+/.test(hostPart)) {
          ip = hostPart;
        } else {
          host = hostPart;
        }
      }
      hops.push({
        hop: hopNum,
        host,
        ip,
        rtt1: parseFloat(hopMatch[3]) || null,
        rtt2: hopMatch[4] ? parseFloat(hopMatch[4]) : null,
        rtt3: hopMatch[5] ? parseFloat(hopMatch[5]) : null,
        timeout: false,
      });
    }
  }

  if (hops.length === 0) {
    warnings.push("No hop data could be parsed from output");
  }

  const reachedDest = hops.some(h => !h.timeout && h.rtt1 !== null);
  return {
    success: hops.length > 0,
    hops,
    hopCount: hops.length,
    summary: hops.length > 0
      ? `${hops.length} hop${hops.length !== 1 ? "s" : ""} traced`
      : "No route traced",
    warnings,
  };
}

// Parse Windows tracert: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
const WIN_HOP_RE = /^\s*(\d+)\s+(<?\d+\s+ms|[*])\s+(<?\d+\s+ms|[*])\s+(<?\d+\s+ms|[*])\s+(.*)/;

function parseWindowsTracert(raw: string): TracerouteParseResult {
  const lines = raw.split("\n");
  const hops: RouteHop[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const m = line.match(WIN_HOP_RE);
    if (!m) continue;
    const hopNum = parseInt(m[1]);
    const parseRtt = (s: string): number | null => {
      if (s === "*") return null;
      const n = s.replace(/[^0-9]/g, "");
      return n ? parseInt(n) : null;
    };
    const rtt1 = parseRtt(m[2]);
    const rtt2 = parseRtt(m[3]);
    const rtt3 = parseRtt(m[4]);
    const host = m[5].trim() || null;
    const timeout = rtt1 === null && rtt2 === null && rtt3 === null;
    hops.push({ hop: hopNum, host, ip: host, rtt1, rtt2, rtt3, timeout });
  }

  return {
    success: hops.length > 0,
    hops,
    hopCount: hops.length,
    summary: hops.length > 0 ? `${hops.length} hops traced` : "No route traced",
    warnings,
  };
}

export function parseTracerouteOutput(raw: string, platform: string): TracerouteParseResult {
  if (!raw || raw.trim().length === 0) {
    return { success: false, hops: [], hopCount: 0, summary: "No output received", warnings: ["Empty output"] };
  }
  return platform === "win32" ? parseWindowsTracert(raw) : parseUnixTraceroute(raw);
}
