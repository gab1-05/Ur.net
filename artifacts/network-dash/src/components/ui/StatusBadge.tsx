import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface StatusBadgeProps {
  status: "success" | "failure" | "partial" | "running" | "up" | "down" | "unknown";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status === "running") {
    return (
      <Badge variant="outline" className={cn("bg-primary/10 text-primary border-primary/20", className)}>
        <Activity className="h-3 w-3 mr-1 animate-pulse" />
        Running
      </Badge>
    );
  }

  const variants = {
    success: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
    up: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
    failure: "bg-destructive/10 text-destructive dark:text-destructive border-destructive/20 hover:bg-destructive/20",
    down: "bg-destructive/10 text-destructive dark:text-destructive border-destructive/20 hover:bg-destructive/20",
    partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    unknown: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  };

  const labels = {
    success: "Success",
    failure: "Failure",
    partial: "Partial",
    up: "Up",
    down: "Down",
    unknown: "Unknown",
  };

  return (
    <Badge variant="outline" className={cn(variants[status], "transition-colors font-medium", className)}>
      {labels[status]}
    </Badge>
  );
}
