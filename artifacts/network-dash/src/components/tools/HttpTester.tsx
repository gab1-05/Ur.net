import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface HttpResult {
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

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function statusColor(code: number | null) {
  if (!code) return "text-muted-foreground";
  if (code < 300) return "text-emerald-500";
  if (code < 400) return "text-yellow-500";
  return "text-red-500";
}

export function HttpTester() {
  const [url, setUrl] = useState("https://example.com");
  const [method, setMethod] = useState("HEAD");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HttpResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url_fetch = "/api/diagnostics/http";
      console.log("[HttpTester] fetch:", url_fetch, "origin:", location.origin, "base:", import.meta.env.BASE_URL);
      const resp = await fetch(url_fetch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const isOk = result?.statusCode != null && result.statusCode < 400;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">URL</Label>
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/api"
            className="h-8 text-xs font-mono"
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS"].map(m => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={run} disabled={loading} className="h-8 text-xs px-4" size="sm">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
        </Button>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>
      )}

      {result && (
        <div className="flex flex-col gap-3 text-xs">
          {/* Status row */}
          <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/30">
            {isOk
              ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
            <span className={`font-bold text-base font-mono ${statusColor(result.statusCode)}`}>
              {result.statusCode ?? "—"}
            </span>
            <span className="text-muted-foreground">{result.statusText}</span>
            <span className="ml-auto font-mono text-muted-foreground">{result.responseTimeMs}ms</span>
          </div>

          {/* URL chain */}
          {result.redirectChain.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Redirects</p>
              {result.redirectChain.map((r, i) => (
                <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                  <Badge variant="outline" className="text-[9px] py-0">{r.status}</Badge>
                  <span className="text-muted-foreground truncate">{r.url}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              ))}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <Badge variant="outline" className={`text-[9px] py-0 ${statusColor(result.statusCode)}`}>{result.statusCode}</Badge>
                <span className="truncate">{result.finalUrl}</span>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2">
            {result.contentType && (
              <div className="bg-muted/30 rounded p-2 border border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">Content-Type</p>
                <p className="font-mono truncate">{result.contentType}</p>
              </div>
            )}
            {result.contentLength != null && (
              <div className="bg-muted/30 rounded p-2 border border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">Content-Length</p>
                <p className="font-mono">{result.contentLength.toLocaleString()} bytes</p>
              </div>
            )}
            {result.tlsProtocol && (
              <div className="bg-muted/30 rounded p-2 border border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">TLS Protocol</p>
                <p className="font-mono">{result.tlsProtocol}</p>
              </div>
            )}
            {result.tlsIssuer && (
              <div className="bg-muted/30 rounded p-2 border border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">TLS Issuer</p>
                <p className="font-mono truncate">{result.tlsIssuer}</p>
              </div>
            )}
          </div>

          {/* Response Headers */}
          {Object.keys(result.headers).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Response Headers</p>
              <div className="bg-muted/20 rounded border border-border p-2 max-h-48 overflow-y-auto space-y-0.5">
                {Object.entries(result.headers).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[40%_60%] gap-1 font-mono text-[10px]">
                    <span className="text-primary truncate">{k}</span>
                    <span className="text-muted-foreground truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
