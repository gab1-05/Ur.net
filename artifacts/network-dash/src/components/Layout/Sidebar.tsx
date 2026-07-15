import { Link, useLocation } from "wouter";
import {
  Activity, Server, History, Settings, Command,
  Menu, Wifi, Globe, Shield, Network, Calculator, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/diagnostics", label: "Tools", icon: Command },
  { href: "/history", label: "History", icon: History },
  { href: "/interfaces", label: "Interfaces", icon: Server },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border/70 shrink-0 bg-sidebar/80 backdrop-blur-sm">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/20 shadow-sm">
        <Wifi className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-semibold text-sm tracking-tight text-foreground">Ur<span className="text-primary">.net</span></span>
        <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80">Control Center</span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`group flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all ${
                isActive
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {item.label}
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
        <div className="px-3 py-3 border-t border-border/70">
          <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">Status</p>
            <p className="mt-1 text-sm font-medium text-foreground">Live monitoring</p>
          </div>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden h-7 w-7">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-44 p-0 bg-sidebar border-r-border">
          <Logo />
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
