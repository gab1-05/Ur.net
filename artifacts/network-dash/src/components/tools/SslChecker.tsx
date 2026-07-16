import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

interface SslResult {
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
}

function DaysIndicator({ days }: { days: number }) {
  const color = days < 0 ? "text-red-500" : days < 14 ? "text-yellow-500" : "text-emerald-500";
  const label = days < 0 ? "EXPIRED" : `${days}d remaining`;
  return <span className={`font-mono font-bold ${color}`}>{label}</span>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="bg-muted/30 rounded p-2 border border-border">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-mono text-xs truncate" title={value}>{value}</p>
    </div>
  );
}

export function SslChecker() {
  const [host, setHost] = useState("example.com");
  const [port, setPort] = useState("443");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SslResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/diagnostics/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port: parseInt(port) || 443 }),
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

  const Icon = result?.error
    ? ShieldX
    : result?.daysRemaining != null && result.daysRemaining < 0
    ? ShieldX
    : result?.daysRemaining != null && result.daysRemaining < 14
    ? ShieldAlert
    : ShieldCheck;

  const iconColor = result?.error || (result?.daysRemaining != null && result.daysRemaining < 0)
    ? "text-red-500"
    : result?.daysRemaining != null && result.daysRemaining < 14
    ? "text-yellow-500"
    : "text-emerald-500";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Hostname</Label>
          <Input
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="example.com"
            className="h-8 text-xs font-mono"
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Port</Label>
          <Input
            value={port}
            onChange={e => setPort(e.target.value)}
            className="h-8 w-20 text-xs font-mono"
          />
        </div>
        <Button onClick={run} disabled={loading} className="h-8 text-xs px-4" size="sm">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check"}
        </Button>
      </div>

      {error && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}

      {result && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/30">
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
            <div>
              <p className="font-semibold">{result.subject || result.host}</p>
              <p className="text-muted-foreground text-[11px]">{result.issuerOrg || result.issuer}</p>
            </div>
            <div className="ml-auto text-right">
              <DaysIndicator days={result.daysRemaining} />
              {result.protocol && <p className="text-[10px] text-muted-foreground">{result.protocol}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Subject CN" value={result.subject} />
            <Field label="Issuer" value={result.issuerOrg || result.issuer} />
            <Field label="Valid From" value={result.validFrom ? new Date(result.validFrom).toLocaleDateString() : null} />
            <Field label="Valid To" value={result.validTo ? new Date(result.validTo).toLocaleDateString() : null} />
            <Field label="Protocol" value={result.protocol} />
            <Field label="Cipher" value={result.cipher} />
            <Field label="Serial" value={result.serialNumber} />
          </div>

          {result.subjectAltNames.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subject Alt Names ({result.subjectAltNames.length})</p>
              <div className="flex flex-wrap gap-1">
                {result.subjectAltNames.slice(0, 20).map(san => (
                  <Badge key={san} variant="secondary" className="text-[10px] font-mono">{san}</Badge>
                ))}
                {result.subjectAltNames.length > 20 && (
                  <Badge variant="outline" className="text-[10px]">+{result.subjectAltNames.length - 20} more</Badge>
                )}
              </div>
            </div>
          )}

          {result.fingerprint && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">SHA1 Fingerprint</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{result.fingerprint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
