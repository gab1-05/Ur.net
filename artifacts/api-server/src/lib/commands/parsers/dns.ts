export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number | null;
}

export interface DnsParseResult {
  success: boolean;
  records: DnsRecord[];
  server: string | null;
  summary: string;
  warnings: string[];
}

// Parse nslookup output
function parseNslookup(raw: string, target: string, recordType: string): DnsParseResult {
  const lines = raw.split("\n");
  const records: DnsRecord[] = [];
  const warnings: string[] = [];
  let server: string | null = null;

  // "Server:  8.8.8.8"
  const serverLine = lines.find(l => l.trim().startsWith("Server:"));
  if (serverLine) {
    server = serverLine.replace("Server:", "").trim();
  }

  // Parse A/AAAA: "Address:  1.2.3.4"
  // Skip the first "Address:" which is the server's IP
  let skippedFirst = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Address:") || trimmed.startsWith("Address:")) {
      if (!skippedFirst && server) { skippedFirst = true; continue; }
      const val = trimmed.replace(/^Address:\s*/, "").replace(/#\d+$/, "").trim();
      if (val && !val.includes(server ?? "")) {
        records.push({ type: recordType === "AAAA" ? "AAAA" : "A", name: target, value: val, ttl: null });
      }
    }
    // MX
    if (trimmed.includes("mail exchanger")) {
      const mx = trimmed.replace(/.*mail exchanger\s*=\s*/, "").trim();
      if (mx) records.push({ type: "MX", name: target, value: mx, ttl: null });
    }
    // NS
    if (trimmed.includes("nameserver")) {
      const ns = trimmed.replace(/.*nameserver\s*=\s*/, "").trim();
      if (ns) records.push({ type: "NS", name: target, value: ns, ttl: null });
    }
    // CNAME
    if (trimmed.includes("canonical name")) {
      const cname = trimmed.replace(/.*canonical name\s*=\s*/, "").trim();
      if (cname) records.push({ type: "CNAME", name: target, value: cname, ttl: null });
    }
  }

  if (records.length === 0) warnings.push("No DNS records found in output");

  return {
    success: records.length > 0,
    records,
    server,
    summary: records.length > 0
      ? `${records.length} record${records.length !== 1 ? "s" : ""} found`
      : "No records found",
    warnings,
  };
}

// Parse dig output
function parseDig(raw: string, target: string, recordType: string): DnsParseResult {
  const lines = raw.split("\n");
  const records: DnsRecord[] = [];
  const warnings: string[] = [];
  let server: string | null = null;
  let inAnswerSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(";; SERVER:")) {
      server = trimmed.replace(";; SERVER:", "").trim();
    }
    if (trimmed === ";; ANSWER SECTION:") { inAnswerSection = true; continue; }
    if (trimmed.startsWith(";;") && inAnswerSection && trimmed !== ";; ANSWER SECTION:") {
      inAnswerSection = false;
    }
    if (inAnswerSection && trimmed && !trimmed.startsWith(";")) {
      // "example.com.   299   IN   A   1.2.3.4"
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 5) {
        const name = parts[0].replace(/\.$/, "");
        const ttl = parseInt(parts[1]) || null;
        const type = parts[3];
        const value = parts.slice(4).join(" ");
        records.push({ type, name, value, ttl });
      }
    }
  }

  if (records.length === 0) warnings.push("No records in ANSWER SECTION");

  return {
    success: records.length > 0,
    records,
    server,
    summary: records.length > 0 ? `${records.length} record${records.length !== 1 ? "s" : ""} found` : "No records found",
    warnings,
  };
}

export function parseDnsOutput(raw: string, target: string, recordType: string, tool: "dig" | "nslookup"): DnsParseResult {
  if (!raw || raw.trim().length === 0) {
    return { success: false, records: [], server: null, summary: "No output received", warnings: ["Empty output"] };
  }
  return tool === "dig" ? parseDig(raw, target, recordType) : parseNslookup(raw, target, recordType);
}
