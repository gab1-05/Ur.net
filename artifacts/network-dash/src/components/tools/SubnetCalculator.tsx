import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function ipToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return NaN;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function numToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

function calcSubnet(cidr: string) {
  const [ip, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr);
  if (!ip || isNaN(prefix) || prefix < 0 || prefix > 32) return null;

  const ipNum = ipToNum(ip);
  if (isNaN(ipNum)) return null;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const hosts = prefix >= 31 ? Math.pow(2, 32 - prefix) : Math.max(0, Math.pow(2, 32 - prefix) - 2);
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;

  return {
    ip, prefix,
    networkAddress: numToIp(network),
    broadcastAddress: numToIp(broadcast),
    subnetMask: numToIp(mask),
    wildcardMask: numToIp(~mask >>> 0),
    firstHost: numToIp(first),
    lastHost: numToIp(last),
    totalHosts: Math.pow(2, 32 - prefix),
    usableHosts: hosts,
    cidr,
  };
}

function Row({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

const PRESETS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.1.0/24", "192.168.0.0/16", "10.10.0.0/16", "10.10.10.0/30"];

export function SubnetCalculator() {
  const [value, setValue] = useState("192.168.1.0/24");
  const result = useMemo(() => calcSubnet(value), [value]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">IP / CIDR</Label>
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="192.168.1.0/24"
          className="h-8 text-xs font-mono"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <Badge
            key={p}
            variant="outline"
            className="text-[10px] font-mono cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={() => setValue(p)}
          >
            {p}
          </Badge>
        ))}
      </div>

      {result ? (
        <div className="bg-muted/20 rounded border border-border px-3 py-1">
          <Row label="Network Address" value={result.networkAddress} />
          <Row label="Broadcast Address" value={result.broadcastAddress} />
          <Row label="Subnet Mask" value={result.subnetMask} />
          <Row label="Wildcard Mask" value={result.wildcardMask} />
          <Row label="First Usable Host" value={result.firstHost} />
          <Row label="Last Usable Host" value={result.lastHost} />
          <Row label="CIDR Notation" value={`/${result.prefix}`} />
          <Row label="Total Addresses" value={result.totalHosts.toLocaleString()} />
          <Row label="Usable Hosts" value={result.usableHosts.toLocaleString()} />
          <Row
            label="IP Class"
            value={
              result.ip.startsWith("10.") || result.ip.startsWith("172.1") || result.ip.startsWith("192.168.")
                ? "Private (RFC 1918)"
                : "Public"
            }
            mono={false}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Enter a valid CIDR like <span className="font-mono">192.168.1.0/24</span></p>
      )}
    </div>
  );
}
