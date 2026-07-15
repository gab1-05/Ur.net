import { Layout } from "@/components/Layout/Layout";
import { useGetInterfaces, getGetInterfacesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, Network } from "lucide-react";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function Interfaces() {
  const { data: interfaces, isLoading, refetch, isRefetching } = useGetInterfaces({
    query: { queryKey: getGetInterfacesQueryKey() }
  });

  const interfaceList = Array.isArray(interfaces) ? interfaces : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Network Interfaces</h1>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interfaceList.map((iface) => (
              <Card key={iface.name} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border pb-4 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Network className="h-4 w-4 text-primary" />
                      {iface.name}
                    </CardTitle>
                    {iface.displayName && (
                      <p className="text-xs text-muted-foreground">{iface.displayName}</p>
                    )}
                  </div>
                  <StatusBadge status={iface.state} />
                </CardHeader>
                <CardContent className="pt-4 p-0">
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">IPv4</span>
                      <span className="font-mono">{iface.ipv4 || "-"}</span>
                    </div>
                    {iface.ipv6 && (
                      <div className="px-4 py-3 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">IPv6</span>
                        <span className="font-mono text-xs max-w-[150px] truncate" title={iface.ipv6}>{iface.ipv6}</span>
                      </div>
                    )}
                    <div className="px-4 py-3 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">MAC</span>
                      <span className="font-mono">{iface.mac || "-"}</span>
                    </div>
                    {iface.gateway && (
                      <div className="px-4 py-3 flex justify-between items-center text-sm bg-muted/20">
                        <span className="text-muted-foreground font-medium">Gateway</span>
                        <span className="font-mono">{iface.gateway}</span>
                      </div>
                    )}
                    <div className="px-4 py-3 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Type</span>
                      <span className="capitalize">{iface.type || "-"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {interfaceList.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-dashed rounded-md">
                No interfaces found.
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
