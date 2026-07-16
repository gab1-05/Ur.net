import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Network } from "lucide-react";

interface ArpEntry {
  ip: string;
  mac: string;
  iface: string;
  type: string;
}

interface ArpResult {
  entries: ArpEntry[];
  demoMode: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ArpTable() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/diagnostics/arp");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Local ARP cache — maps IP addresses to MAC addresses on your LAN.</p>
        <Button onClick={refresh} disabled={loading} size="sm" className="h-7 text-xs gap-1.5">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}

      {result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{result.entries.length} entries</span>
            {result.demoMode && <Badge variant="secondary" className="text-[10px]">Demo</Badge>}
          </div>

          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">MAC Address</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Interface</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((e, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-1.5 text-primary">{e.ip}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{e.mac}</td>
                    <td className="px-3 py-1.5">{e.iface}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant={e.type === "static" ? "default" : "secondary"} className="text-[9px] font-mono">
                        {e.type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Network className="h-8 w-8 opacity-30" />
          <p className="text-xs">Click Refresh to load the ARP table</p>
        </div>
      )}
    </div>
  );
}
