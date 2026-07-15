export interface PingMetrics {
  packetsTransmitted: number;
  packetsReceived: number;
  packetLoss: number;
  latencyMin: number | null;
  latencyMax: number | null;
  latencyAvg: number | null;
  jitter: number | null;
}

export interface PingParseResult {
  success: boolean;
  metrics: PingMetrics;
  summary: string;
  warnings: string[];
}

function parseLinuxPing(raw: string): PingParseResult {
  const warnings: string[] = [];
  let packetsTransmitted = 0;
  let packetsReceived = 0;
  let packetLoss = 100;
  let latencyMin: number | null = null;
  let latencyMax: number | null = null;
  let latencyAvg: number | null = null;
  let jitter: number | null = null;

  // Packets: "4 packets transmitted, 4 received, 0% packet loss"
  const pktMatch = raw.match(/(\d+) packets? transmitted,\s*(\d+) received,\s*([\d.]+)%\s*packet loss/i);
  if (pktMatch) {
    packetsTransmitted = parseInt(pktMatch[1]);
    packetsReceived = parseInt(pktMatch[2]);
    packetLoss = parseFloat(pktMatch[3]);
  } else {
    warnings.push("Could not parse packet statistics line");
  }

  // RTT: "rtt min/avg/max/mdev = 10.123/12.456/15.789/1.234 ms"
  const rttMatch = raw.match(/rtt\s+min\/avg\/max\/mdev\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s*ms/i);
  if (rttMatch) {
    latencyMin = parseFloat(rttMatch[1]);
    latencyAvg = parseFloat(rttMatch[2]);
    latencyMax = parseFloat(rttMatch[3]);
    jitter = parseFloat(rttMatch[4]);
  }

  const success = packetsReceived > 0;
  const summary = success
    ? `${packetsReceived}/${packetsTransmitted} packets received, avg ${latencyAvg?.toFixed(2) ?? "?"}ms`
    : `All ${packetsTransmitted} packets lost`;

  return {
    success,
    metrics: { packetsTransmitted, packetsReceived, packetLoss, latencyMin, latencyMax, latencyAvg, jitter },
    summary,
    warnings,
  };
}

function parseMacPing(raw: string): PingParseResult {
  // macOS ping output is similar to Linux
  return parseLinuxPing(raw);
}

function parseWindowsPing(raw: string): PingParseResult {
  const warnings: string[] = [];
  let packetsTransmitted = 0;
  let packetsReceived = 0;
  let packetLoss = 100;
  let latencyMin: number | null = null;
  let latencyMax: number | null = null;
  let latencyAvg: number | null = null;

  // "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
  const pktMatch = raw.match(/Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+),\s*Lost\s*=\s*\d+\s*\(([\d.]+)%/i);
  if (pktMatch) {
    packetsTransmitted = parseInt(pktMatch[1]);
    packetsReceived = parseInt(pktMatch[2]);
    packetLoss = parseFloat(pktMatch[3]);
  } else {
    warnings.push("Could not parse packet statistics line");
  }

  // "Minimum = 10ms, Maximum = 15ms, Average = 12ms"
  const rttMatch = raw.match(/Minimum\s*=\s*(\d+)ms,\s*Maximum\s*=\s*(\d+)ms,\s*Average\s*=\s*(\d+)ms/i);
  if (rttMatch) {
    latencyMin = parseFloat(rttMatch[1]);
    latencyMax = parseFloat(rttMatch[2]);
    latencyAvg = parseFloat(rttMatch[3]);
  }

  const success = packetsReceived > 0;
  const summary = success
    ? `${packetsReceived}/${packetsTransmitted} packets received, avg ${latencyAvg?.toFixed(0) ?? "?"}ms`
    : `All ${packetsTransmitted} packets lost`;

  return {
    success,
    metrics: { packetsTransmitted, packetsReceived, packetLoss, latencyMin, latencyMax, latencyAvg, jitter: null },
    summary,
    warnings,
  };
}

export function parsePingOutput(raw: string, platform: string): PingParseResult {
  if (!raw || raw.trim().length === 0) {
    return {
      success: false,
      metrics: { packetsTransmitted: 0, packetsReceived: 0, packetLoss: 100, latencyMin: null, latencyMax: null, latencyAvg: null, jitter: null },
      summary: "No output received from ping command",
      warnings: ["Empty output"],
    };
  }
  switch (platform) {
    case "win32":
      return parseWindowsPing(raw);
    case "darwin":
      return parseMacPing(raw);
    default:
      return parseLinuxPing(raw);
  }
}
