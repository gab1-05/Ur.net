import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Terminal, Wifi } from "lucide-react";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "./Sidebar";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "../CommandPalette";
import { useState, useEffect } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {health?.demoMode && (
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-b border-amber-500/20 px-4 py-1 text-[11px] font-medium text-center">
          DEMO MODE — results are simulated
        </div>
      )}
      <header className="h-10 flex items-center px-3 border-b border-border bg-background shrink-0 justify-between gap-2">
        <div className="flex items-center gap-2 md:hidden">
          <Sidebar />
          <span className="text-sm font-bold">Ur<span className="text-primary">.net</span></span>
        </div>

        <div className="hidden md:flex flex-1 items-center">
          {/* breadcrumb or context if needed */}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            className="text-muted-foreground h-7 px-2 text-xs flex gap-1.5 font-normal border-border"
            onClick={() => setCmdOpen(true)}
          >
            <Terminal className="h-3 w-3" />
            <span className="hidden sm:inline text-[11px]">Command Palette</span>
            <kbd className="pointer-events-none hidden sm:flex h-4 select-none items-center rounded border bg-muted px-1 font-mono text-[9px] opacity-70">
              ⌘K
            </kbd>
          </Button>

          {health?.demoMode && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Demo</Badge>}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-7 w-7 text-muted-foreground"
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </header>

      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </>
  );
}
