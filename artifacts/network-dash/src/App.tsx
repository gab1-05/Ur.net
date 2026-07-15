import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";

import Overview from "@/pages/Overview";
import Diagnostics from "@/pages/Diagnostics";
import History from "@/pages/History";
import Interfaces from "@/pages/Interfaces";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10000, retry: 1 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/diagnostics" component={Diagnostics} />
      <Route path="/history" component={History} />
      <Route path="/interfaces" component={Interfaces} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
