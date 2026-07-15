import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  detail?: string | null;
  target?: string | null;
  triggeredAt: string;
  onDismiss?: (id: string) => void;
  className?: string;
}

export function AlertBanner({ id, severity, message, detail, target, triggeredAt, onDismiss, className }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const Icon = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    critical: AlertCircle,
  }[severity];

  const variants = {
    info: "border-blue-500/20 text-blue-600 bg-blue-500/10 dark:text-blue-400 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
    warning: "border-amber-500/20 text-amber-600 bg-amber-500/10 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
    error: "border-red-500/20 text-red-600 bg-red-500/10 dark:text-red-400 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
    critical: "border-red-500 text-red-600 bg-red-500/15 dark:text-red-400 [&>svg]:text-red-600 dark:[&>svg]:text-red-400 shadow-sm",
  };

  return (
    <Alert className={cn(variants[severity], className)}>
      <Icon className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle className="text-sm font-semibold flex items-center gap-2">
          {message}
          {target && <span className="font-mono text-xs opacity-80 px-1.5 py-0.5 rounded bg-foreground/5">{target}</span>}
        </AlertTitle>
        {detail && <AlertDescription className="mt-1 text-xs opacity-90">{detail}</AlertDescription>}
        <div className="text-[10px] mt-1.5 opacity-70 font-mono">
          {new Date(triggeredAt).toLocaleString()}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 opacity-70 hover:opacity-100 hover:bg-foreground/5"
          onClick={() => {
            setDismissed(true);
            onDismiss(id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Alert>
  );
}
