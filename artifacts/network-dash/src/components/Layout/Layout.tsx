import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { StatusBar } from "./StatusBar";
import { ReactNode } from "react";

export function Layout({ children, noPadding }: { children: ReactNode; noPadding?: boolean }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? "" : "p-4 md:p-5"}`}>
          {noPadding ? children : (
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          )}
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
