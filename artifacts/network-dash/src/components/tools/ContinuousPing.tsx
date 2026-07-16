import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PingPoint {
  seq: number;
  time: string;
  latency: number | null;
  loss: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_POINTS = 60;

export function ContinuousPing() {
  const [target, setTarget] = useState("8.8.8.8");
  const [interval, setIntervalMs] = useState("2000");
  const [running, setRunning] = useState(false);
  const [points, setPoints] = useState<PingPoint[]>([]);
  const [seq, setSeq] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  const doPing = useCallback(async (seqNum: number) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    try {
      const resp = await fetch("/api/diagnostics/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, count: 1, timeout: 3 }),
      });
      if (!resp.ok) throw new Error("API error");
      const data = await resp.json();
      const latency = data.metrics?.latencyAvg ?? null;
      const loss = data.metrics?.packetLoss === 100 || !data.metrics;
      setPoints(prev => [...prev.slice(-(MAX_POINTS - 1)), { seq: seqNum, time, latency, loss }]);
    } catch {
      setPoints(prev => [...prev.slice(-(MAX_POINTS - 1)), { seq: seqNum, time, latency: null, loss: true }]);
    }
  }, [target]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    setPoints([]);
    setSeq(0);
    runningRef.current = true;
    setRunning(true);

    let currentSeq = 0;
    const loop = async () => {
      if (!runningRef.current) return;
      currentSeq++;
      setSeq(currentSeq);
      await doPing(currentSeq);
      if (runningRef.current) {
        timerRef.current = setTimeout(loop, parseInt(interval) || 2000);
      }
    };
    loop();
  }, [doPing, interval]);

  useEffect(() => {
    return () => { runningRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const avgLatency = points.filter(p => p.latency != null).reduce((s, p, _, a) => s + (p.latency ?? 0) / a.length, 0);
  const lossCount = points.filter(p => p.loss).length;
  const lossRate = points.length > 0 ? ((lossCount / points.length) * 100).toFixed(1) : "0.0";

  const chartData = points.map(p => ({
    name: p.time,
    latency: p.latency,
    seq: p.seq,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Target</Label>
          <Input
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="8.8.8.8 or hostname"
            className="h-8 text-xs font-mono"
            disabled={running}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Interval</Label>
          <Select value={interval} onValueChange={setIntervalMs} disabled={running}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1000" className="text-xs">1s</SelectItem>
              <SelectItem value="2000" className="text-xs">2s</SelectItem>
              <SelectItem value="5000" className="text-xs">5s</SelectItem>
              <SelectItem value="10000" className="text-xs">10s</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={running ? stop : start}
          className={`h-8 text-xs px-4 gap-1.5 ${running ? "bg-red-600 hover:bg-red-700" : ""}`}
          size="sm"
        >
          {running ? <><Square className="h-3 w-3" /> Stop</> : <><Play className="h-3 w-3" /> Start</>}
        </Button>
      </div>

      {points.length > 0 && (
        <>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Avg:</span>
              <span className="font-mono font-medium">{avgLatency.toFixed(1)}ms</span>
            </div>
            <div>
              <span className="text-muted-foreground">Loss:</span>
              <span className={`font-mono font-medium ml-1 ${parseFloat(lossRate) > 0 ? "text-red-500" : "text-emerald-500"}`}>{lossRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Packets:</span>
              <span className="font-mono font-medium ml-1">{seq}</span>
            </div>
            {running && <Badge variant="secondary" className="text-[10px] animate-pulse">Live</Badge>}
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="ms" width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                  formatter={(v: unknown) => {
  const num = typeof v === "number" ? v : null;
  return num != null ? [`${num.toFixed(1)}ms`, "Latency"] : ["Timeout", "Status"];
}}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: "hsl(var(--primary))" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="max-h-28 overflow-y-auto rounded border border-border">
            <table className="w-full text-[10px] font-mono">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="text-left px-2 py-1 text-muted-foreground">#</th>
                  <th className="text-left px-2 py-1 text-muted-foreground">Time</th>
                  <th className="text-left px-2 py-1 text-muted-foreground">Latency</th>
                  <th className="text-left px-2 py-1 text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map(p => (
                  <tr key={p.seq} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-2 py-0.5 text-muted-foreground">{p.seq}</td>
                    <td className="px-2 py-0.5">{p.time}</td>
                    <td className="px-2 py-0.5">{p.latency != null ? `${p.latency.toFixed(1)}ms` : "—"}</td>
                    <td className="px-2 py-0.5">
                      <span className={p.loss ? "text-red-500" : "text-emerald-500"}>
                        {p.loss ? "timeout" : "ok"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {points.length === 0 && !running && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Activity className="h-8 w-8 opacity-30" />
          <p className="text-xs">Click Start to begin continuous ping monitoring</p>
        </div>
      )}
    </div>
  );
}
