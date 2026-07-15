import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Activity, Command as CommandIcon, History, Server, Settings, ListTree, PlayCircle } from "lucide-react";
import { useLocation } from "wouter";

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runAction(() => setLocation("/diagnostics?type=ping"))}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Run Ping</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/diagnostics?type=traceroute"))}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Run Traceroute</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/diagnostics?type=dns"))}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Run DNS Lookup</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/diagnostics?type=port-check"))}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Check Port</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runAction(() => setLocation("/"))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/diagnostics"))}>
            <CommandIcon className="mr-2 h-4 w-4" />
            <span>Diagnostics</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/history"))}>
            <History className="mr-2 h-4 w-4" />
            <span>History</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/interfaces"))}>
            <Server className="mr-2 h-4 w-4" />
            <span>Interfaces</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/profiles"))}>
            <ListTree className="mr-2 h-4 w-4" />
            <span>Profiles</span>
          </CommandItem>
          <CommandItem onSelect={() => runAction(() => setLocation("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
