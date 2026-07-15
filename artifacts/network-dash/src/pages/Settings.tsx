import { Layout } from "@/components/Layout/Layout";
import { useGetSystemInfo, getGetSystemInfoQueryKey, useGetSystemCapabilities, getGetSystemCapabilitiesQueryKey, useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Server, Monitor, Activity } from "lucide-react";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const { data: sysInfo } = useGetSystemInfo({ query: { queryKey: getGetSystemInfoQueryKey() } });
  const { data: caps } = useGetSystemCapabilities({ query: { queryKey: getGetSystemCapabilitiesQueryKey() } });
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  
  const { theme, setTheme } = useTheme();

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Environment</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure application preferences and view system environment.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>Customize the interface theme.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Theme</span>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Runtime Mode</span>
                  {health?.demoMode ? (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Demo Mode</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20">Production</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="font-mono text-sm">{health?.version || "1.0.0"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <span className="capitalize font-medium text-sm">{sysInfo?.environment || "Unknown"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Hostname</TableCell>
                      <TableCell className="font-mono">{sysInfo?.hostname || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">OS / Platform</TableCell>
                      <TableCell className="capitalize">{sysInfo?.os || "-"} ({sysInfo?.platform || "-"})</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Architecture</TableCell>
                      <TableCell>{sysInfo?.arch || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Node Version</TableCell>
                      <TableCell className="font-mono">{sysInfo?.nodeVersion || "-"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Public IP</TableCell>
                      <TableCell className="font-mono">{sysInfo?.publicIp || "-"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Capabilities
                </CardTitle>
                <CardDescription>Commands available on this host system.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {caps && Object.entries(caps.commands).map(([cmd, available]) => (
                      <TableRow key={cmd}>
                        <TableCell className="font-medium uppercase text-xs tracking-wider">{cmd}</TableCell>
                        <TableCell className="text-right">
                          {available ? (
                            <CheckCircle2 className="h-4 w-4 text-teal-500 inline-block" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive inline-block" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
