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
    <div className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15">
        <Wifi className="w-4 h-4 text-primary" />
      </div>
      <span className="font-bold text-sm tracking-tight text-foreground">Ur<span className="text-primary">.net</span></span>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-44 border-r border-border bg-sidebar shrink-0">
        <Logo />
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground/50 font-mono">v1.0.0</p>
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
