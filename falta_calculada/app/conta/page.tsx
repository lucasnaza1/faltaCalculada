"use client";

/** Conta: vínculo do casal (gerar/aceitar código) + logout. */

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Heart, Loader2, LogOut } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useSync } from "@/lib/sync";

function randomCode(): string {
  // sem caracteres ambíguos (0/O, 1/I/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

export default function ContaPage() {
  const supabase = getSupabase();
  const { session, partner, refreshPartner, signOut } = useSync();

  const [invite, setInvite] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!session) return;
    // carrega convite ativo (não usado, não expirado)
    void (async () => {
      const { data } = await supabase
        .from("pair_invites")
        .select("code, expires_at, used")
        .eq("created_by", session.user.id)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setInvite(data?.code ?? null);
    })();
  }, [session, supabase]);

  const generateInvite = useCallback(async () => {
    if (!session) return;
    setInviteBusy(true);
    try {
      const code = randomCode();
      const { error } = await supabase.from("pair_invites").insert({
        code,
        created_by: session.user.id,
      });
      if (!error) setInvite(code);
    } finally {
      setInviteBusy(false);
    }
  }, [session, supabase]);

  async function acceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const { data, error } = await supabase.rpc("accept_invite", {
        p_code: codeInput.trim().toUpperCase(),
      });
      if (error) throw error;
      if (data === true) {
        setAccepted(true);
        refreshPartner();
      } else {
        setAcceptError(
          "Código inválido, expirado ou já usado. Peça um novo.",
        );
      }
    } catch {
      setAcceptError("Não foi possível aceitar o convite. Tente de novo.");
    } finally {
      setAcceptBusy(false);
    }
  }

  // gate do AuthGate garante sessão; seguro apenas aguardar
  if (!session) {
    return <p className="pt-10 text-center text-muted">Carregando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Conta &amp; sync</h1>
        <p className="mt-1 text-sm text-muted">
          {session.user.email}
          {partner && ` · conectado com ${partner.displayName}`}
        </p>
      </header>

      {partner ? (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <p>
            Vinculado com <strong>{partner.displayName}</strong>. Alterne entre
            os dados no topo da tela inicial.
          </p>
        </div>
      ) : (
        <>
          <section
            aria-labelledby="gerar-codigo"
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface p-4"
          >
            <h2 id="gerar-codigo" className="font-semibold">
              Convidar parceiro(a)
            </h2>
            <p className="text-sm text-muted">
              Gere um código e envie para seu parceiro(a). Ele vale 24h.
            </p>

            {invite ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                  {invite}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(invite);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 p-2 text-sm text-muted transition-colors hover:text-foreground"
                  aria-label="Copiar código"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void generateInvite()}
                disabled={inviteBusy}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black disabled:opacity-60"
              >
                {inviteBusy && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                Gerar código
              </button>
            )}
          </section>

          <section
            aria-labelledby="usar-codigo"
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface p-4"
          >
            <h2 id="usar-codigo" className="font-semibold">
              Tem um código?
            </h2>
            {accepted ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" aria-hidden /> Vinculado! Volte para
                a tela inicial.
              </p>
            ) : (
              <form className="flex gap-2" onSubmit={acceptInvite}>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  aria-label="Código do convite"
                  className="w-32 rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 text-center font-mono text-lg tracking-widest"
                />
                <button
                  type="submit"
                  disabled={acceptBusy || codeInput.length < 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black disabled:opacity-60"
                >
                  {acceptBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Vincular
                </button>
              </form>
            )}
            {acceptError && (
              <p role="alert" className="text-sm text-danger">
                {acceptError}
              </p>
            )}
          </section>
        </>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Sair da conta
      </button>
    </div>
  );
}
