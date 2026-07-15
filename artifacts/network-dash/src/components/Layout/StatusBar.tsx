import { useEffect, useState } from "react";
import { useHealthCheck, getHealthCheckQueryKey, useGetSystemInfo } from "@workspace/api-client-react";
import { Circle } from "lucide-react";

export function StatusBar() {
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 15000 } });
  const { data: sysInfo } = useGetSystemInfo();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour12: false });

  return (
    <div className="h-6 flex items-center px-3 border-t border-border bg-muted/30 text-[10px] text-muted-foreground font-mono gap-4 shrink-0 select-none">
      <span className="flex items-center gap-1">
        <Circle className={`h-1.5 w-1.5 fill-current ${health ? "text-emerald-500" : "text-red-500"}`} />
        {health ? "API online" : "API offline"}
      </span>
      {health?.demoMode && (
        <span className="text-amber-500">demo</span>
      )}
      {sysInfo && (
        <>
          <span className="hidden sm:inline">{sysInfo.platform}</span>
          <span className="hidden md:inline">{sysInfo.hostname}</span>
        </>
      )}
      <span className="ml-auto">{timeStr}</span>
    </div>
  );
}
