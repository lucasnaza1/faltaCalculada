"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { StoreProvider } from "@/lib/store";
import { SyncProvider, useSync } from "@/lib/sync";
import { BottomNav } from "./BottomNav";
import { PartnerSwitch } from "./PartnerSwitch";

const emptySubscribe = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Guarda de sessão: enquanto não sabemos se há sessão, não decide nada.
 * Sem sessão → mantém o app funcionando local e mostra o CTA de login. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready, partner, partnerData } = useSync();
  const mounted = useMounted();
  const router = useRouter();

  const showSwitch = mounted && session && partner && partnerData;

  return (
    <>
      {showSwitch && <PartnerSwitch />}
      {children}
      {mounted && ready && !session && (
        <button
          type="button"
          onClick={() => router.push("/entrar")}
          className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-[#16161a]/95 px-4 py-2.5 text-sm font-medium text-primary shadow-lg backdrop-blur transition-colors hover:bg-primary/10"
        >
          <Heart className="h-4 w-4" aria-hidden />
          Ativar sync com o parceiro(a)
        </button>
      )}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SyncProvider>
      <StoreProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          <main className="flex-1 px-4 pb-28 pt-6">
            <AuthGate>{children}</AuthGate>
          </main>
          <BottomNav />
        </div>
      </StoreProvider>
    </SyncProvider>
  );
}
