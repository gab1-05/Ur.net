import { useState } from "react";
import { Layout } from "@/components/Layout/Layout";
import { DiagnosticsForm, DiagnosticsFormData } from "@/components/diagnostics/DiagnosticsForm";
import { ResultsViewer } from "@/components/diagnostics/ResultsViewer";
import { HttpTester } from "@/components/tools/HttpTester";
import { SslChecker } from "@/components/tools/SslChecker";
import { WhoisLookup } from "@/components/tools/WhoisLookup";
import { SubnetCalculator } from "@/components/tools/SubnetCalculator";
import { ArpTable } from "@/components/tools/ArpTable";
import { ContinuousPing } from "@/components/tools/ContinuousPing";
import {
  useRunPing,
  useRunTraceroute,
  useRunDns,
  useRunPortCheck,
  useCheckGateway,
  getCheckGatewayQueryKey,
} from "@workspace/api-client-react";
import { DiagnosticRun, DnsInputRecordType } from "@/lib/api-schemas";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, ArrowLeftRight, Globe, Plug, Network, Wifi, Shield,
  Search, Calculator, Table2, Radio, Server, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type ToolId =
  | "ping" | "traceroute" | "dns" | "port-check" | "gateway"
  | "http" | "ssl" | "whois" | "subnet" | "arp" | "continuous-ping";

interface Tool {
  id: ToolId;
  label: string;
  icon: React.ElementType;
  description: string;
  group: string;
}

const TOOLS: Tool[] = [
  { id: "ping", label: "Ping", icon: Activity, description: "ICMP echo test", group: "Core" },
  { id: "traceroute", label: "Traceroute", icon: ArrowLeftRight, description: "Route path discovery", group: "Core" },
  { id: "dns", label: "DNS Lookup", icon: Globe, description: "Resolve DNS records", group: "Core" },
  { id: "port-check", label: "Port Scan", icon: Plug, description: "TCP port reachability", group: "Core" },
  { id: "gateway", label: "Gateway", icon: Network, description: "Default gateway check", group: "Core" },
  { id: "continuous-ping", label: "Live Ping", icon: Radio, description: "Continuous latency monitor", group: "Monitor" },
  { id: "http", label: "HTTP Test", icon: Wifi, description: "HTTP/HTTPS endpoint tester", group: "Advanced" },
  { id: "ssl", label: "SSL Check", icon: Shield, description: "Certificate inspector", group: "Advanced" },
  { id: "whois", label: "WHOIS", icon: Search, description: "Domain registration lookup", group: "Advanced" },
  { id: "arp", label: "ARP Table", icon: Table2, description: "Local network ARP cache", group: "Network" },
  { id: "subnet", label: "Subnet Calc", icon: Calculator, description: "IP/CIDR calculator", group: "Utils" },
];

const GROUPS = ["Core", "Monitor", "Advanced", "Network", "Utils"];

export default function Diagnostics() {
  const [activeTool, setActiveTool] = useState<ToolId>("ping");
  const [currentRun, setCurrentRun] = useState<DiagnosticRun | null>(null);
  const { toast } = useToast();

  const ping = useRunPing();
  const traceroute = useRunTraceroute();
  const dns = useRunDns();
  const portCheck = useRunPortCheck();
  const { refetch: runGateway, isFetching: gatewayPending } = useCheckGateway({ query: { queryKey: getCheckGatewayQueryKey(), enabled: false } });

  const isPending =
    ping.isPending || traceroute.isPending || dns.isPending ||
    portCheck.isPending || gatewayPending;

  const handleSubmit = async (data: DiagnosticsFormData) => {
    try {
      let result: DiagnosticRun;
      switch (data.type) {
        case "ping":
          result = await ping.mutateAsync({ data: { target: data.target, count: data.count, timeout: data.timeout } });
          break;
        case "traceroute":
          result = await traceroute.mutateAsync({ data: { target: data.target, maxHops: data.maxHops, timeout: data.timeout } });
          break;
        case "dns":
          result = await dns.mutateAsync({ data: { target: data.target, recordType: data.recordType || DnsInputRecordType.A, server: data.server } });
          break;
        case "port-check":
          if (!data.port) throw new Error("Port is required");
          result = await portCheck.mutateAsync({ data: { target: data.target, port: data.port, timeout: data.timeout } });
          break;
        case "gateway": {
          const { data: gData } = await runGateway();
          if (!gData) throw new Error("Gateway check returned no data");
          result = gData as DiagnosticRun;
          break;
        }
        default:
          throw new Error("Unknown diagnostic type");
      }
      setCurrentRun(result);
    } catch (err: unknown) {
      toast({ title: "Diagnostic failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const tool = TOOLS.find(t => t.id === activeTool)!;

  return (
    <Layout noPadding>
      <div className="flex h-full">
        {/* Tool picker sidebar */}
        <div className="w-44 shrink-0 border-r border-border flex flex-col bg-muted/20 h-full">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tools</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {GROUPS.map(group => {
                const groupTools = TOOLS.filter(t => t.group === group);
                return (
                  <div key={group} className="mb-1">
                    <p className="px-3 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{group}</p>
                    {groupTools.map(t => {
                      const Icon = t.icon;
                      const isActive = activeTool === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setActiveTool(t.id); setCurrentRun(null); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary border-r-2 border-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="text-xs truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Tool content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
         {/* Tool header */}
         <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0 bg-background">
           {(() => {
             const Icon = tool.icon;
             return <Icon className="h-3.5 w-3.5 text-primary" />;
           })()}
           <span className="text-xs font-semibold">{tool.label}</span>
           <ChevronRight className="h-3 w-3 text-muted-foreground" />
           <span className="text-xs text-muted-foreground">{tool.description}</span>
         </div>

          <div className="flex-1 p-4 flex flex-col gap-4">
            {/* Core network tools */}
            {["ping", "traceroute", "dns", "port-check", "gateway"].includes(activeTool) && (
              <>
                <DiagnosticsForm
                  defaultType={activeTool as "ping" | "traceroute" | "dns" | "port-check" | "gateway"}
                  onSubmit={handleSubmit}
                  isPending={isPending}
                />
                {currentRun && (
                  <ResultsViewer run={currentRun} />
                )}
              </>
            )}

            {/* Live ping monitor */}
            {activeTool === "continuous-ping" && <ContinuousPing />}

            {/* HTTP tester */}
            {activeTool === "http" && <HttpTester />}

            {/* SSL checker */}
            {activeTool === "ssl" && <SslChecker />}

            {/* WHOIS lookup */}
            {activeTool === "whois" && <WhoisLookup />}

            {/* ARP table */}
            {activeTool === "arp" && <ArpTable />}

            {/* Subnet calculator */}
            {activeTool === "subnet" && <SubnetCalculator />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
