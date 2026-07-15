import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Play } from "lucide-react";
import { useGetSystemCapabilities } from "@workspace/api-client-react";
import { DnsInputRecordType } from "@workspace/api-client-react/src/generated/api.schemas";

const baseSchema = z.object({
  target: z.string().min(1, "Target is required"),
  type: z.enum(["ping", "traceroute", "dns", "port-check", "gateway"]),
});

const formSchema = baseSchema.and(
  z.object({
    count: z.coerce.number().min(1).max(20).optional(),
    timeout: z.coerce.number().min(1).max(60).optional(),
    maxHops: z.coerce.number().min(1).max(60).optional(),
    recordType: z.nativeEnum(DnsInputRecordType).optional(),
    server: z.string().optional(),
    port: z.coerce.number().min(1).max(65535).optional(),
  })
);

export type DiagnosticsFormData = z.infer<typeof formSchema>;

interface DiagnosticsFormProps {
  defaultValues?: Partial<DiagnosticsFormData>;
  onSubmit: (data: DiagnosticsFormData) => void;
  isPending: boolean;
}

export function DiagnosticsForm({ defaultValues, onSubmit, isPending }: DiagnosticsFormProps) {
  const { data: caps } = useGetSystemCapabilities();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const form = useForm<DiagnosticsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target: "",
      type: "ping",
      count: 4,
      timeout: 5,
      maxHops: 30,
      recordType: DnsInputRecordType.A,
      ...defaultValues,
    },
  });

  const type = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="w-full sm:w-[200px]">
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagnostic type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ping" disabled={caps && !caps.commands.ping}>Ping</SelectItem>
                    <SelectItem value="traceroute" disabled={caps && !caps.commands.traceroute}>Traceroute</SelectItem>
                    <SelectItem value="dns" disabled={caps && !caps.commands.dns}>DNS Lookup</SelectItem>
                    <SelectItem value="port-check" disabled={caps && !caps.commands.portCheck}>Port Check</SelectItem>
                    <SelectItem value="gateway">Gateway Check</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {type !== "gateway" && (
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Target Host / IP</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 8.8.8.8, google.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {type === "port-check" && (
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem className="w-[120px]">
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="443" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {type !== "gateway" && (
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border border-border rounded-md p-4">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground w-full">
              {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Advanced Options
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {type === "ping" && (
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ping Count</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              
              {type === "traceroute" && (
                <FormField
                  control={form.control}
                  name="maxHops"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Hops</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {type === "dns" && (
                <>
                  <FormField
                    control={form.control}
                    name="recordType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Record Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(DnsInputRecordType).map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom DNS Server</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional (e.g. 1.1.1.1)" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          <Play className="h-4 w-4 mr-2" />
          {isPending ? "Running..." : "Run Diagnostic"}
        </Button>
      </form>
    </Form>
  );
}
