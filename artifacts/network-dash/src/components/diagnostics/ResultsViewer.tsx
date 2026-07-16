import { DiagnosticRun } from "@/lib/api-schemas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "../ui/StatusBadge";
import { TracerouteHops } from "./TracerouteHops";
import { DnsRecords } from "./DnsRecords";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock } from "lucide-react";

interface ResultsViewerProps {
  run: DiagnosticRun;
}

export function ResultsViewer({ run }: ResultsViewerProps) {
  const { parsedResult, metrics, rawOutput, demoMode, error, parseWarnings } = run;

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col">
      <div className="bg-muted px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground uppercase tracking-wide text-sm">{run.type}</h3>
          <span className="text-muted-foreground">→</span>
          <span className="font-mono text-sm">{run.target}</span>
          {demoMode && <Badge variant="secondary" className="ml-2 text-[10px]">DEMO</Badge>}
        </div>
        <div className="flex items-center gap-4">
          {run.durationMs && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="h-3 w-3" />
              {run.durationMs}ms
            </div>
          )}
          <StatusBadge status={run.status} />
        </div>
      </div>

      <Tabs defaultValue="parsed" className="w-full flex-1 flex flex-col">
        <div className="px-4 border-b border-border bg-card">
          <TabsList className="bg-transparent h-12 p-0 rounded-none w-full justify-start">
            <TabsTrigger 
              value="parsed" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4"
            >
              Results
            </TabsTrigger>
            <TabsTrigger 
              value="raw"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-4"
            >
              Raw Output
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="parsed" className="m-0 p-4 sm:p-6 flex-1 bg-card">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <strong className="font-semibold block mb-1">Execution Error</strong>
                <p className="font-mono text-xs">{error}</p>
              </div>
            </div>
          )}

          {parsedResult && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Summary</h4>
              <p className="text-base text-foreground font-medium">{parsedResult.summary}</p>
            </div>
          )}

          {metrics && Object.keys(metrics).length > 0 && (
            <div className="mb-8">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Metrics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(metrics).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  return (
                    <div key={key} className="bg-muted p-3 rounded-md">
                      <div className="text-xs text-muted-foreground mb-1 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-lg font-mono font-semibold tabular-nums">
                        {value}
                        {key.includes('latency') || key.includes('jitter') ? 'ms' : ''}
                        {key === 'packetLoss' ? '%' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {run.hops && run.hops.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Route</h4>
              <TracerouteHops hops={run.hops} />
            </div>
          )}

          {run.dnsRecords && run.dnsRecords.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">DNS Records</h4>
              <DnsRecords records={run.dnsRecords} />
            </div>
          )}

          {parseWarnings && parseWarnings.length > 0 && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md text-sm">
              <div className="flex items-center gap-2 mb-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Parse Warnings
              </div>
              <ul className="list-disc pl-5 space-y-1 opacity-90 text-xs">
                {parseWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="raw" className="m-0 flex-1">
          <ScrollArea className="h-[400px] w-full bg-slate-950 dark:bg-black p-4">
            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">
              {rawOutput || "No raw output available."}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
