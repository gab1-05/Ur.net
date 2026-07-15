import { z } from "zod";

// Strict allowlist-based command registry
// Never execute arbitrary shell input — only commands in this list

export const ALLOWED_COMMANDS = {
  ping: true,
  traceroute: true,
  tracert: true,
  nslookup: true,
  dig: true,
  ip: true,
  ifconfig: true,
  ipconfig: true,
  arp: true,
  netstat: true,
} as const;

// Strict target validation — only hostnames, IPs, and FQDN
const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.?$/;
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

export function validateTarget(target: string): { valid: boolean; reason?: string } {
  const t = target.trim();
  if (!t || t.length === 0) return { valid: false, reason: "Target is required" };
  if (t.length > 253) return { valid: false, reason: "Target too long" };
  // Reject shell metacharacters
  if (/[;&|`$<>(){}[\]\\'"!#~]/.test(t)) {
    return { valid: false, reason: "Target contains invalid characters" };
  }
  if (hostnameRegex.test(t) || ipv4Regex.test(t) || ipv6Regex.test(t)) {
    return { valid: true };
  }
  return { valid: false, reason: "Target must be a valid hostname or IP address" };
}

export function sanitizeTarget(target: string): string {
  return target.trim().toLowerCase().replace(/[^a-zA-Z0-9.\-:]/g, "");
}

export const dnsRecordTypes = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "PTR", "SOA"] as const;
export type DnsRecordType = typeof dnsRecordTypes[number];

export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function validateCount(count: number, min = 1, max = 20): boolean {
  return Number.isInteger(count) && count >= min && count <= max;
}

export function validateMaxHops(hops: number): boolean {
  return Number.isInteger(hops) && hops >= 1 && hops <= 30;
}

export function validateTimeout(timeout: number, max = 60): boolean {
  return Number.isInteger(timeout) && timeout >= 1 && timeout <= max;
}

export const PingInputSchema = z.object({
  target: z.string().min(1),
  count: z.number().int().min(1).max(20).optional().default(4),
  timeout: z.number().int().min(1).max(30).optional().default(10),
});

export const TracerouteInputSchema = z.object({
  target: z.string().min(1),
  maxHops: z.number().int().min(1).max(30).optional().default(20),
  timeout: z.number().int().min(1).max(60).optional().default(30),
});

export const DnsInputSchema = z.object({
  target: z.string().min(1),
  recordType: z.enum(dnsRecordTypes).optional().default("A"),
  server: z.string().nullable().optional(),
});

export const PortCheckInputSchema = z.object({
  target: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  timeout: z.number().int().min(1).max(30).optional().default(5),
});
