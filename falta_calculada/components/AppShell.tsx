"use client";

import { StoreProvider } from "@/lib/store";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <main className="flex-1 px-4 pb-28 pt-6">{children}</main>
        <BottomNav />
      </div>
    </StoreProvider>
  );
}
