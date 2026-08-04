import { Link, useLocation } from "wouter";
import {
  Activity, Server, History, Settings, Command,
  Menu, Network, Gauge, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

const navItems = [
  { href: "/", label: "Overview", description: "Live summary", icon: Gauge },
  { href: "/diagnostics", label: "Diagnostics", description: "Run tools", icon: Command },
  { href: "/history", label: "History", description: "Past runs", icon: History },
  { href: "/interfaces", label: "Interfaces", description: "Adapters", icon: Server },
  { href: "/settings", label: "Settings", description: "Preferences", icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0 bg-sidebar">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Network className="w-5 h-5" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">Ur<span className="text-primary">.net</span></span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">Network Ops</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 15000 } });

  const NavContent = () => (
    <nav className="flex flex-col gap-1.5 px-2.5 py-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium cursor-pointer transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-4 w-4 shrink-0 transition-colors" />
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                <span className={`block truncate text-[11px] font-normal ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {item.description}
                </span>
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 border-r border-border/70 bg-sidebar/95 shrink-0">
        <Logo />
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="rounded-lg border border-sidebar-border bg-background/45 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Status
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-sidebar-foreground">{health ? "API online" : "API offline"}</p>
              <span className={`h-2 w-2 rounded-full ${health ? "bg-emerald-500" : "bg-destructive"}`} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{health?.demoMode ? "Demo data enabled" : "Ready for live checks"}</p>
          </div>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-7 w-7">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-border">
          <Logo />
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
