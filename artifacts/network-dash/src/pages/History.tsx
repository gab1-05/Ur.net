import { Layout } from "@/components/Layout/Layout";
import { useGetDiagnosticHistory, getGetDiagnosticHistoryQueryKey, useRerunDiagnostic } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function History() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("");
  const { toast } = useToast();

  const queryParams = {
    type: typeFilter !== "all" ? typeFilter : undefined,
    target: targetFilter || undefined,
    limit: 50,
  };

  const { data: history, isLoading, refetch } = useGetDiagnosticHistory(queryParams, {
    query: { queryKey: getGetDiagnosticHistoryQueryKey(queryParams) }
  });

  const historyRuns = Array.isArray(history?.runs) ? history.runs : [];
  const rerun = useRerunDiagnostic();

  const handleRerun = async (id: number) => {
    try {
      await rerun.mutateAsync({ id });
      toast({
        title: "Diagnostic re-run started",
        description: "The results will appear shortly.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to re-run",
        variant: "destructive"
      });
    }
  };

  const handleExportCsv = (id: number) => {
    window.open(`/api/diagnostics/history/${id}/csv`, "_blank");
  };

  const handleExportJson = (id: number) => {
    window.open(`/api/diagnostics/history/${id}/json`, "_blank");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Diagnostic History</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-md shadow-sm sticky top-0 z-10">
          <div className="w-full sm:w-[200px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ping">Ping</SelectItem>
                <SelectItem value="traceroute">Traceroute</SelectItem>
                <SelectItem value="dns">DNS</SelectItem>
                <SelectItem value="port-check">Port Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input 
              placeholder="Filter by target..." 
              value={targetFilter} 
              onChange={(e) => setTargetFilter(e.target.value)} 
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable rows={10} columns={6} />
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRuns.map((run) => (
                  <TableRow key={run.id} className="font-mono text-sm">
                    <TableCell className="text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
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
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.durationMs ? `${run.durationMs}ms` : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleExportJson(run.id)} title="Export JSON">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRerun(run.id)} disabled={rerun.isPending} title="Re-run">
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {historyRuns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No history found for the given filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
