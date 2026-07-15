import { DnsRecord } from "@workspace/api-client-react/src/generated/api.schemas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function DnsRecords({ records }: { records: DnsRecord[] }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="text-right w-[100px]">TTL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, i) => (
            <TableRow key={i} className="font-mono text-sm">
              <TableCell>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {record.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{record.name}</TableCell>
              <TableCell className="font-medium break-all">{record.value}</TableCell>
              <TableCell className="text-right text-muted-foreground">{record.ttl ? `${record.ttl}s` : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
