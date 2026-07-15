import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  className?: string;
}

export function KpiCard({ title, value, icon, description, delta, className }: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
        {(description || delta) && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            {delta && (
              <span
                className={cn(
                  "font-medium flex items-center",
                  delta.trend === "up" ? "text-destructive" : delta.trend === "down" ? "text-primary" : "text-muted-foreground"
                )}
              >
                {delta.trend === "up" && "↑"}
                {delta.trend === "down" && "↓"}
                {delta.trend === "neutral" && "→"}
                {" "}{delta.value}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
