import { RouteHop } from "@workspace/api-client-react/src/generated/api.schemas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function TracerouteHops({ hops }: { hops: RouteHop[] }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[60px] text-center">Hop</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>IP</TableHead>
            <TableHead className="text-right">RTT 1</TableHead>
            <TableHead className="text-right hidden sm:table-cell">RTT 2</TableHead>
            <TableHead className="text-right hidden sm:table-cell">RTT 3</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hops.map((hop) => (
            <TableRow key={hop.hop} className="font-mono text-sm">
              <TableCell className="text-center font-medium">{hop.hop}</TableCell>
              <TableCell>
                {hop.timeout ? (
                  <span className="text-muted-foreground">* * *</span>
                ) : (
                  hop.host || hop.ip || ""
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{hop.ip !== hop.host ? hop.ip : ""}</TableCell>
              <TableCell className="text-right">
                {hop.timeout ? <Badge variant="outline" className="text-[10px]">Timeout</Badge> : `${hop.rtt1}ms`}
              </TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                {!hop.timeout && hop.rtt2 ? `${hop.rtt2}ms` : ""}
              </TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                {!hop.timeout && hop.rtt3 ? `${hop.rtt3}ms` : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
