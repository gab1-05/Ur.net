import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface WhoisResult {
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
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="bg-muted/30 rounded p-2 border border-border">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-mono text-xs">{value}</p>
    </div>
  );
}

export function WhoisLookup() {
  const [domain, setDomain] = useState("example.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/diagnostics/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
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

  const formatDate = (s: string | null) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex flex-col gap-1">
          <Label className="text-xs">Domain</Label>
          <Input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="example.com"
            className="h-8 text-xs font-mono"
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </div>
        <Button onClick={run} disabled={loading} className="h-8 text-xs px-4" size="sm">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lookup"}
        </Button>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}

      {result && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Registrar" value={result.registrar} />
            <Field label="Registrant Org" value={result.registrantOrg} />
            <Field label="Registered" value={formatDate(result.createdAt)} />
            <Field label="Expires" value={formatDate(result.expiresAt)} />
            <Field label="Updated" value={formatDate(result.updatedAt)} />
          </div>

          {result.status.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
              <div className="flex flex-wrap gap-1">
                {result.status.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-mono">{s.split(" ")[0]}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.nameservers.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nameservers</p>
              <div className="flex flex-col gap-0.5">
                {result.nameservers.map((ns, i) => (
                  <p key={i} className="font-mono text-[11px] text-muted-foreground">{ns.toLowerCase()}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground px-2"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? "Hide" : "Show"} raw WHOIS
            </Button>
          </div>

          {showRaw && result.raw && (
            <pre className="bg-muted/20 border border-border rounded p-2 text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-48 whitespace-pre-wrap">
              {result.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
