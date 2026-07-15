import net from "net";
import tls from "tls";
import http from "http";
import https from "https";
import os from "os";
import dns from "dns/promises";
import { URL } from "url";
import { execCommand, getPlatform } from "./executor.js";
import { parsePingOutput } from "./parsers/ping.js";
import { parseTracerouteOutput } from "./parsers/traceroute.js";
import { parseDnsOutput } from "./parsers/dns.js";
import { getInterfacesFromOS } from "./parsers/interfaces.js";
import { validateTarget, sanitizeTarget, dnsRecordTypes, type DnsRecordType } from "./allowlist.js";

export type RunMode = "live" | "demo";

export function detectRunMode(): RunMode {
  if (process.env.DEMO_MODE === "true") return "demo";
  return "live";
}

// ─── PING ────────────────────────────────────────────────────────────────────
export async function runPing(target: string, count = 4, timeoutSec = 10): Promise<{
  raw: string;
  parsed: ReturnType<typeof parsePingOutput>;
  demoMode: boolean;
}> {
  const validation = validateTarget(target);
  if (!validation.valid) throw new Error(validation.reason ?? "Invalid target");
  const safeTarget = sanitizeTarget(target);
  const platform = getPlatform();

  let args: string[];
  if (platform === "win32") {
    args = ["-n", String(count), "-w", String(timeoutSec * 1000), safeTarget];
  } else {
    args = ["-c", String(count), "-W", String(timeoutSec), safeTarget];
  }

  const cmd = platform === "win32" ? "ping" : "ping";
  const result = await execCommand(cmd, args, (timeoutSec + 2) * 1000);
  const raw = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : "");

  const mode = detectRunMode();
  if (mode === "demo" || (result.exitCode !== 0 && !result.stdout.trim())) {
    return { raw: demoRawPing(target, count), parsed: parsePingOutput(demoRawPing(target, count), platform), demoMode: true };
  }

  return { raw, parsed: parsePingOutput(raw, platform), demoMode: false };
}

// ─── TRACEROUTE ───────────────────────────────────────────────────────────────
export async function runTraceroute(target: string, maxHops = 20, timeoutSec = 30): Promise<{
  raw: string;
  parsed: ReturnType<typeof parseTracerouteOutput>;
  demoMode: boolean;
}> {
  const validation = validateTarget(target);
  if (!validation.valid) throw new Error(validation.reason ?? "Invalid target");
  const safeTarget = sanitizeTarget(target);
  const platform = getPlatform();

  let cmd: string;
  let args: string[];
  if (platform === "win32") {
    cmd = "tracert";
    args = ["-h", String(maxHops), safeTarget];
  } else {
    cmd = "traceroute";
    args = ["-m", String(maxHops), safeTarget];
  }

  const result = await execCommand(cmd, args, timeoutSec * 1000);
  const raw = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : "");

  const mode = detectRunMode();
  if (mode === "demo" || result.timedOut || (!result.stdout.trim() && result.exitCode !== 0)) {
    const demoRaw = demoRawTraceroute(target);
    return { raw: demoRaw, parsed: parseTracerouteOutput(demoRaw, platform), demoMode: true };
  }

  return { raw, parsed: parseTracerouteOutput(raw, platform), demoMode: false };
}

// ─── DNS ─────────────────────────────────────────────────────────────────────
export async function runDns(target: string, recordType: DnsRecordType = "A", server?: string | null): Promise<{
  raw: string;
  parsed: ReturnType<typeof parseDnsOutput>;
  demoMode: boolean;
}> {
  const validation = validateTarget(target);
  if (!validation.valid) throw new Error(validation.reason ?? "Invalid target");
  const safeTarget = sanitizeTarget(target);
  const platform = getPlatform();

  try {
    const resolver = new dns.Resolver();
    if (server) {
      const safeServer = sanitizeTarget(server);
      resolver.setServers([safeServer]);
    }

    let records: string[] = [];
    let rawLines: string[] = [`; DNS query for ${safeTarget} type ${recordType}`];

    switch (recordType) {
      case "A": { const r = await resolver.resolve4(safeTarget); records = r; rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   A   ${v}`)); break; }
      case "AAAA": { const r = await resolver.resolve6(safeTarget); records = r; rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   AAAA   ${v}`)); break; }
      case "MX": { const r = await resolver.resolveMx(safeTarget); rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   MX   ${v.priority} ${v.exchange}`)); records = r.map(v => `${v.priority} ${v.exchange}`); break; }
      case "NS": { const r = await resolver.resolveNs(safeTarget); records = r; rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   NS   ${v}`)); break; }
      case "TXT": { const r = await resolver.resolveTxt(safeTarget); records = r.map(t => t.join("")); rawLines.push(`;; ANSWER SECTION:`); records.forEach(v => rawLines.push(`${safeTarget}.   300   IN   TXT   "${v}"`)); break; }
      case "CNAME": { const r = await resolver.resolveCname(safeTarget); records = r; rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   CNAME   ${v}`)); break; }
      case "PTR": { const r = await resolver.resolvePtr(safeTarget); records = r; rawLines.push(`;; ANSWER SECTION:`); r.forEach(v => rawLines.push(`${safeTarget}.   300   IN   PTR   ${v}`)); break; }
      default: records = [];
    }

    const raw = rawLines.join("\n");
    const parsed = parseDnsOutput(raw, safeTarget, recordType, "dig");
    return { raw, parsed, demoMode: false };
  } catch {
    const demoRaw = demoRawDns(target, recordType);
    return { raw: demoRaw, parsed: parseDnsOutput(demoRaw, target, recordType, "dig"), demoMode: true };
  }
}

// ─── PORT CHECK ──────────────────────────────────────────────────────────────
export async function runPortCheck(target: string, port: number, timeoutSec = 5): Promise<{
  raw: string;
  open: boolean;
  latencyMs: number | null;
  demoMode: boolean;
}> {
  const validation = validateTarget(target);
  if (!validation.valid) throw new Error(validation.reason ?? "Invalid target");
  const safeTarget = sanitizeTarget(target);

  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const finish = (open: boolean) => {
      if (resolved) return;
      resolved = true;
      const latencyMs = open ? Date.now() - start : null;
      const raw = `Port check: ${safeTarget}:${port}\nStatus: ${open ? "OPEN" : "CLOSED"}\nLatency: ${latencyMs ?? "N/A"}ms`;
      resolve({ raw, open, latencyMs, demoMode: false });
    };

    const timer = setTimeout(() => { socket.destroy(); finish(false); }, timeoutSec * 1000);
    socket.connect(port, safeTarget, () => { clearTimeout(timer); socket.destroy(); finish(true); });
    socket.on("error", () => { clearTimeout(timer); finish(false); });
  });
}

// ─── GATEWAY CHECK ───────────────────────────────────────────────────────────
export async function runGatewayCheck(): Promise<{
  raw: string;
  gateway: string | null;
  reachable: boolean;
  latencyMs: number | null;
  demoMode: boolean;
}> {
  const platform = getPlatform();
  let gateway: string | null = null;

  try {
    if (platform === "win32") {
      const r = await execCommand("ipconfig", [], 5000);
      const match = r.stdout.match(/Default Gateway[^:]*:\s*([\d.]+)/i);
      if (match) gateway = match[1];
    } else if (platform === "darwin") {
      const r = await execCommand("netstat", ["-rn"], 5000);
      const match = r.stdout.match(/^default\s+([\d.]+)/m);
      if (match) gateway = match[1];
    } else {
      const r = await execCommand("ip", ["route", "show", "default"], 5000);
      const match = r.stdout.match(/default via ([\d.]+)/);
      if (match) gateway = match[1];
    }
  } catch { /* fall through */ }

  if (!gateway) {
    return { raw: "Could not determine default gateway", gateway: null, reachable: false, latencyMs: null, demoMode: detectRunMode() === "demo" };
  }

  const pingResult = await runPing(gateway, 2, 5);
  return {
    raw: `Gateway: ${gateway}\n${pingResult.raw}`,
    gateway,
    reachable: pingResult.parsed.success,
    latencyMs: pingResult.parsed.metrics.latencyAvg,
    demoMode: pingResult.demoMode,
  };
}

// ─── HTTP TESTER ─────────────────────────────────────────────────────────────
export interface HttpTestResult {
  url: string;
  finalUrl: string;
  method: string;
  statusCode: number | null;
  statusText: string;
  responseTimeMs: number;
  headers: Record<string, string>;
  redirectChain: Array<{ url: string; status: number }>;
  contentType: string | null;
  contentLength: number | null;
  tlsProtocol: string | null;
  tlsIssuer: string | null;
  error: string | null;
  demoMode: boolean;
}

export async function runHttpTest(inputUrl: string, method = "HEAD", timeoutMs = 10000): Promise<HttpTestResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are supported");
  }

  const redirectChain: Array<{ url: string; status: number }> = [];
  let currentUrl = parsedUrl.href;
  const start = Date.now();

  const makeRequest = (url: string, redirectsLeft = 5): Promise<HttpTestResult> =>
    new Promise((resolve) => {
      let u: URL;
      try { u = new URL(url); } catch { resolve({ url: inputUrl, finalUrl: url, method, statusCode: null, statusText: "Invalid URL", responseTimeMs: Date.now() - start, headers: {}, redirectChain, contentType: null, contentLength: null, tlsProtocol: null, tlsIssuer: null, error: "Invalid URL", demoMode: false }); return; }

      const mod = u.protocol === "https:" ? https : http;
      const req = mod.request({ hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80), path: u.pathname + u.search, method, headers: { "User-Agent": "Ur.net/1.0 Network Diagnostics", "Accept": "*/*" }, timeout: timeoutMs, rejectUnauthorized: false }, (res) => {
        const responseTimeMs = Date.now() - start;
        const headers: Record<string, string> = {};
        Object.entries(res.headers).forEach(([k, v]) => { if (v) headers[k] = Array.isArray(v) ? v.join(", ") : v; });

        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0) && res.headers.location && redirectsLeft > 0) {
          const loc = res.headers.location;
          const nextUrl = loc.startsWith("http") ? loc : new URL(loc, u.origin).href;
          redirectChain.push({ url: url, status: res.statusCode! });
          currentUrl = nextUrl;
          res.resume();
          makeRequest(nextUrl, redirectsLeft - 1).then(resolve);
          return;
        }

        res.resume();
        const tlsSocket = (res.socket as tls.TLSSocket);
        const tlsProto = tlsSocket?.getProtocol?.() ?? null;
        const tlsCert = tlsSocket?.getPeerCertificate?.();
        const tlsIssuerRaw = tlsCert?.issuer?.O ?? null;
        const tlsIssuer = Array.isArray(tlsIssuerRaw) ? tlsIssuerRaw[0] ?? null : tlsIssuerRaw;

        resolve({
          url: inputUrl, finalUrl: url, method,
          statusCode: res.statusCode ?? null,
          statusText: res.statusMessage ?? "",
          responseTimeMs, headers, redirectChain,
          contentType: headers["content-type"] ?? null,
          contentLength: headers["content-length"] ? parseInt(headers["content-length"]) : null,
          tlsProtocol: tlsProto, tlsIssuer, error: null, demoMode: false,
        });
      });

      req.on("timeout", () => { req.destroy(); resolve({ url: inputUrl, finalUrl: url, method, statusCode: null, statusText: "Timeout", responseTimeMs: Date.now() - start, headers: {}, redirectChain, contentType: null, contentLength: null, tlsProtocol: null, tlsIssuer: null, error: "Request timed out", demoMode: false }); });
      req.on("error", (err) => { resolve({ url: inputUrl, finalUrl: url, method, statusCode: null, statusText: "Error", responseTimeMs: Date.now() - start, headers: {}, redirectChain, contentType: null, contentLength: null, tlsProtocol: null, tlsIssuer: null, error: err.message, demoMode: false }); });
      req.end();
    });

  return makeRequest(currentUrl);
}

// ─── SSL CHECKER ─────────────────────────────────────────────────────────────
export interface SslCheckResult {
  host: string;
  port: number;
  valid: boolean;
  subject: string;
  subjectAltNames: string[];
  issuer: string;
  issuerOrg: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  protocol: string | null;
  cipher: string | null;
  serialNumber: string;
  fingerprint: string;
  error: string | null;
  demoMode: boolean;
}

export async function runSslCheck(host: string, port = 443): Promise<SslCheckResult> {
  const safeHost = host.replace(/[^a-zA-Z0-9.\-]/g, "");
  if (!safeHost) throw new Error("Invalid host");

  return new Promise((resolve) => {
    const socket = tls.connect({ host: safeHost, port, rejectUnauthorized: false, servername: safeHost }, () => {
      const cert = socket.getPeerCertificate();
      const proto = socket.getProtocol();
      const cipher = socket.getCipher();

      if (!cert || !cert.subject) {
        socket.destroy();
        resolve({ host: safeHost, port, valid: false, subject: "", subjectAltNames: [], issuer: "", issuerOrg: "", validFrom: "", validTo: "", daysRemaining: 0, protocol: proto, cipher: cipher?.name ?? null, serialNumber: "", fingerprint: "", error: "No certificate returned", demoMode: false });
        return;
      }

      const validTo = new Date(cert.valid_to);
      const validFrom = new Date(cert.valid_from);
      const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86400000);
      const sans: string[] = [];
      if (cert.subjectaltname) {
        cert.subjectaltname.split(",").forEach(s => { const trimmed = s.trim().replace(/^DNS:/, ""); if (trimmed) sans.push(trimmed); });
      }

      socket.destroy();
      resolve({
        host: safeHost, port,
        valid: daysRemaining > 0 && socket.authorized !== false,
        subject: String(Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : (cert.subject?.CN ?? "")),
        subjectAltNames: sans,
        issuer: String(Array.isArray(cert.issuer?.CN) ? cert.issuer.CN[0] : (cert.issuer?.CN ?? "")),
        issuerOrg: String(Array.isArray(cert.issuer?.O) ? cert.issuer.O[0] : (cert.issuer?.O ?? "")),
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        daysRemaining,
        protocol: proto,
        cipher: cipher?.name ?? null,
        serialNumber: cert.serialNumber ?? "",
        fingerprint: cert.fingerprint ?? "",
        error: null,
        demoMode: false,
      });
    });

    socket.setTimeout(8000, () => { socket.destroy(); resolve({ host: safeHost, port, valid: false, subject: "", subjectAltNames: [], issuer: "", issuerOrg: "", validFrom: "", validTo: "", daysRemaining: 0, protocol: null, cipher: null, serialNumber: "", fingerprint: "", error: "Connection timed out", demoMode: false }); });
    socket.on("error", (err) => { resolve({ host: safeHost, port, valid: false, subject: "", subjectAltNames: [], issuer: "", issuerOrg: "", validFrom: "", validTo: "", daysRemaining: 0, protocol: null, cipher: null, serialNumber: "", fingerprint: "", error: err.message, demoMode: false }); });
  });
}

// ─── WHOIS ───────────────────────────────────────────────────────────────────
export interface WhoisResult {
  domain: string;
  raw: string;
  registrar: string | null;
  registrantOrg: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  status: string[];
  nameservers: string[];
  error: string | null;
  demoMode: boolean;
}

export async function runWhois(domain: string): Promise<WhoisResult> {
  const safeDomain = domain.replace(/[^a-zA-Z0-9.\-]/g, "").toLowerCase();
  if (!safeDomain) throw new Error("Invalid domain");

  const query = `${safeDomain}\r\n`;
  const whoisServer = "whois.iana.org";

  const raw = await new Promise<string>((resolve, reject) => {
    const socket = new net.Socket();
    let data = "";
    socket.setTimeout(8000);
    socket.connect(43, whoisServer, () => { socket.write(query); });
    socket.on("data", (chunk) => { data += chunk.toString(); });
    socket.on("end", () => resolve(data));
    socket.on("timeout", () => { socket.destroy(); reject(new Error("WHOIS query timed out")); });
    socket.on("error", (err) => reject(err));
  }).catch((err) => `Error: ${err.message}`);

  // If we got a referral whois server, do a second query
  let finalRaw = raw;
  const referralMatch = raw.match(/whois:\s*([\w.\-]+)/i) || raw.match(/Registrar WHOIS Server:\s*([\w.\-]+)/i);
  if (referralMatch?.[1] && referralMatch[1] !== whoisServer) {
    const refServer = referralMatch[1].trim();
    finalRaw = await new Promise<string>((resolve) => {
      const socket = new net.Socket();
      let data = "";
      socket.setTimeout(8000);
      socket.connect(43, refServer, () => { socket.write(query); });
      socket.on("data", (chunk) => { data += chunk.toString(); });
      socket.on("end", () => resolve(data));
      socket.on("timeout", () => { socket.destroy(); resolve(raw); });
      socket.on("error", () => resolve(raw));
    });
  }

  const extract = (pattern: RegExp) => { const m = finalRaw.match(pattern); return m?.[1]?.trim() ?? null; };
  const extractAll = (pattern: RegExp): string[] => {
    const results: string[] = [];
    let m: RegExpExecArray | null;
    const g = new RegExp(pattern.source, "gi");
    while ((m = g.exec(finalRaw)) !== null) { if (m[1]) results.push(m[1].trim()); }
    return [...new Set(results)];
  };

  const registrar = extract(/Registrar:\s*(.+)/i) ?? extract(/registrar-name:\s*(.+)/i);
  const registrantOrg = extract(/Registrant Organization:\s*(.+)/i) ?? extract(/org:\s*(.+)/i);
  const createdAt = extract(/Creation Date:\s*(.+)/i) ?? extract(/created:\s*(.+)/i) ?? extract(/Registration Date:\s*(.+)/i);
  const updatedAt = extract(/Updated Date:\s*(.+)/i) ?? extract(/last-update:\s*(.+)/i);
  const expiresAt = extract(/Registry Expiry Date:\s*(.+)/i) ?? extract(/Expiry Date:\s*(.+)/i) ?? extract(/paid-till:\s*(.+)/i);
  const status = extractAll(/Domain Status:\s*(.+)/i);
  const nameservers = extractAll(/Name Server:\s*(.+)/i);

  return { domain: safeDomain, raw: finalRaw, registrar, registrantOrg, createdAt, updatedAt, expiresAt, status, nameservers, error: raw.startsWith("Error:") ? raw : null, demoMode: false };
}

// ─── ARP TABLE ───────────────────────────────────────────────────────────────
export interface ArpEntry {
  ip: string;
  mac: string;
  iface: string;
  type: string;
}

export async function getArpTable(): Promise<{ entries: ArpEntry[]; demoMode: boolean }> {
  const platform = getPlatform();
  try {
    const result = await execCommand("arp", ["-a"], 5000);
    if (result.exitCode !== 0 || !result.stdout.trim()) throw new Error("arp command failed");

    const entries: ArpEntry[] = [];
    const lines = result.stdout.split("\n");

    if (platform === "win32") {
      let currentIface = "";
      for (const line of lines) {
        const ifaceMatch = line.match(/Interface:\s*([\d.]+)/i);
        if (ifaceMatch) { currentIface = ifaceMatch[1]; continue; }
        const entryMatch = line.match(/([\d.]+)\s+([\w:-]+)\s+(\w+)/);
        if (entryMatch) entries.push({ ip: entryMatch[1], mac: entryMatch[2], iface: currentIface, type: entryMatch[3] });
      }
    } else {
      for (const line of lines) {
        const m = line.match(/\(?([\d.]+)\)?\s+at\s+([\w:?]+)\s+\[?(\w+)\]?\s+on\s+(\w+)/);
        if (m) entries.push({ ip: m[1], mac: m[2], iface: m[4], type: m[3] === "ether" ? "dynamic" : m[3] });
      }
    }

    return { entries, demoMode: false };
  } catch {
    // Demo fallback
    return {
      entries: [
        { ip: "192.168.1.1", mac: "aa:bb:cc:dd:ee:01", iface: "eth0", type: "dynamic" },
        { ip: "192.168.1.100", mac: "aa:bb:cc:dd:ee:02", iface: "eth0", type: "dynamic" },
        { ip: "192.168.1.101", mac: "aa:bb:cc:dd:ee:03", iface: "eth0", type: "dynamic" },
        { ip: "192.168.1.102", mac: "aa:bb:cc:dd:ee:04", iface: "eth0", type: "dynamic" },
        { ip: "224.0.0.251", mac: "01:00:5e:00:00:fb", iface: "eth0", type: "static" },
      ],
      demoMode: true,
    };
  }
}

// ─── INTERFACES ──────────────────────────────────────────────────────────────
export function getNetworkInterfaces() {
  return getInterfacesFromOS();
}

// ─── CAPABILITIES ─────────────────────────────────────────────────────────────
export async function getCapabilities() {
  const platform = getPlatform();
  const demoMode = detectRunMode() === "demo";
  return {
    platform,
    commands: {
      ping: true,
      traceroute: true,
      dns: true,
      portCheck: true,
      interfaces: true,
      arp: platform !== "win32",
      http: true,
      ssl: true,
      whois: true,
    },
    demoMode,
  };
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
function demoRawPing(target: string, count: number): string {
  const lines = [`PING ${target}: 56 data bytes`];
  for (let i = 0; i < count; i++) {
    const rtt = (10 + Math.random() * 20).toFixed(3);
    lines.push(`64 bytes from ${target}: icmp_seq=${i} ttl=64 time=${rtt} ms`);
  }
  lines.push("");
  lines.push(`--- ${target} ping statistics ---`);
  lines.push(`${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000}ms`);
  lines.push(`rtt min/avg/max/mdev = 10.123/15.456/25.789/3.456 ms`);
  return lines.join("\n");
}

function demoRawTraceroute(target: string): string {
  const hops = [
    { n: 1, host: "gateway.local", ip: "192.168.1.1", t: [1.2, 1.1, 1.3] },
    { n: 2, host: "isp-edge.net", ip: "10.0.0.1", t: [5.4, 5.2, 5.6] },
    { n: 3, host: "backbone-01.net", ip: "72.14.0.1", t: [12.3, 12.1, 12.4] },
    { n: 4, host: "*", ip: "*", t: [null, null, null] },
    { n: 5, host: target, ip: "8.8.8.8", t: [14.2, 14.1, 14.3] },
  ];
  const lines = [`traceroute to ${target}, 20 hops max`];
  for (const h of hops) {
    if (h.t[0] === null) { lines.push(` ${h.n}  * * *`); }
    else { lines.push(` ${h.n}  ${h.host} (${h.ip})  ${h.t[0]} ms  ${h.t[1]} ms  ${h.t[2]} ms`); }
  }
  return lines.join("\n");
}

function demoRawDns(target: string, recordType: string): string {
  return [
    `; <<>> DiG 9.11 <<>> ${target} ${recordType}`,
    `;; ANSWER SECTION:`,
    `${target}.   299   IN   ${recordType}   8.8.8.8`,
    `${target}.   299   IN   ${recordType}   8.8.4.4`,
  ].join("\n");
}
