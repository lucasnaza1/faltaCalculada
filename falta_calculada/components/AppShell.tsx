"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { StoreProvider } from "@/lib/store";
import { SyncProvider, useSync } from "@/lib/sync";
import { BottomNav } from "./BottomNav";
import { PartnerSwitch } from "./PartnerSwitch";

/** Gate de autenticação obrigatório.
 * - Aguardando sessão → spinner (não pisca conteúdo).
 * - Sem sessão → redireciona para /entrar (exceto na própria /entrar).
 * - Sessão persistida em cookie/localStorage: loga uma vez só. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready, partner, partnerData } = useSync();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === "/entrar";

  useEffect(() => {
    if (ready && !session && !isAuthPage) {
      router.replace("/entrar");
    }
  }, [ready, session, isAuthPage, router]);

  // aguardando verificação de sessão
  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
      </div>
    );
  }

  const showSwitch = session && partner && partnerData && !isAuthPage;

  return (
    <>
      {showSwitch && <PartnerSwitch />}
      {children}
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
