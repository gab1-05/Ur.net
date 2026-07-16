import { Layout } from "@/components/Layout/Layout";
import { KpiCard } from "@/components/ui/KpiCard";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Server, AlertTriangle, CheckCircle2, History } from "lucide-react";
import { useGetDiagnosticOverview, getGetDiagnosticOverviewQueryKey, useGetAlerts, getGetAlertsQueryKey } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  const { data: overview, isLoading: overviewLoading } = useGetDiagnosticOverview({ query: { queryKey: getGetDiagnosticOverviewQueryKey() } });
  const { data: alerts, isLoading: alertsLoading } = useGetAlerts({ query: { queryKey: getGetAlertsQueryKey() } });

  const alertsList = Array.isArray(alerts) ? alerts : [];
  const latencyTrend = Array.isArray(overview?.latencyTrend) ? overview.latencyTrend : [];
  const packetLossTrend = Array.isArray(overview?.packetLossTrend) ? overview.packetLossTrend : [];
  const recentRuns = Array.isArray(overview?.recentRuns) ? overview.recentRuns : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Operations snapshot</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard Overview</h1>
            </div>
            <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              Updated live
            </div>
          </div>
        </div>

        {/* Alerts Strip */}
        <div className="space-y-2">
          {alertsLoading ? null : alertsList.map((alert) => (
            <AlertBanner
              key={alert.id}
              id={alert.id}
              severity={alert.severity}
              message={alert.message}
              detail={alert.detail}
              target={alert.target}
              triggeredAt={alert.triggeredAt}
            />
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {overviewLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <KpiCard
                title="Avg Latency"
                value={overview?.avgLatency != null ? `${overview.avgLatency.toFixed(1)}ms` : "-"}
                icon={<Activity className="h-4 w-4" />}
                description="Global average across targets"
              />
              <KpiCard
                title="Packet Loss"
                value={overview?.packetLoss != null ? `${overview.packetLoss.toFixed(1)}%` : "-"}
                icon={<AlertTriangle className="h-4 w-4" />}
                description="Global packet loss"
              />
              <KpiCard
                title="Success Rate"
                value={overview?.successRate != null ? `${overview.successRate.toFixed(1)}%` : "-"}
                icon={<CheckCircle2 className="h-4 w-4" />}
                description="Successful runs (24h)"
              />
              <KpiCard
                title="Total Runs"
                value={overview?.totalRuns ?? 0}
                icon={<History className="h-4 w-4" />}
                description="Past 24 hours"
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Latency Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {overviewLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">Loading chart...</div>
                ) : latencyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}ms`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                        labelFormatter={(val) => new Date(val).toLocaleString()}
                        formatter={(val: unknown) => {
  const num = typeof val === "number" ? val : null;
  return num != null ? [`${num}ms`, "Latency"] : ["—", "Value"];
}}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Packet Loss Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {overviewLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">Loading chart...</div>
                ) : packetLossTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={packetLossTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                        labelFormatter={(val) => new Date(val).toLocaleString()}
                        formatter={(val: unknown) => {
  const num = typeof val === "number" ? val : null;
  return num != null ? [`${num}%`, "Packet Loss"] : ["—", "Value"];
}}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Runs */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Diagnostics</h2>
          {overviewLoading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRuns.map((run) => (
                    <TableRow key={run.id} className="font-mono text-sm">
                      <TableCell className="text-muted-foreground">
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-medium uppercase tracking-wider text-xs">
                        {run.type}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {run.target}
                          {run.demoMode && <Badge variant="secondary" className="text-[10px] h-4 px-1">DEMO</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {run.durationMs ? `${run.durationMs}ms` : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No recent runs
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
