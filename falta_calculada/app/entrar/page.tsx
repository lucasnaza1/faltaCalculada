"use client";

/** Login / cadastro — e-mail + senha (Supabase Auth). */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useSync } from "@/lib/sync";

export default function EntrarPage() {
  const router = useRouter();
  const { session, ready } = useSync();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // já logado → vai direto para a home
  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(false);
      setError("Sync não configurado neste ambiente (faltam as variáveis do Supabase).");
      return;
    }
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (err) throw err;
        // cria o perfil de exibição
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          await supabase.from("profiles").upsert({
            user_id: sess.session.user.id,
            display_name: name.trim() || email.split("@")[0],
          });
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? traduzErro(err.message)
          : "Não foi possível continuar.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-6 text-center">
        <Heart className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          falta<span className="text-primary">Calculada</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login"
            ? "Entre para sincronizar com seu parceiro(a)"
            : "Crie sua conta para começar o sync"}
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm">
            Seu nome (aparece para o parceiro)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ana"
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 placeholder:text-muted/60"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 placeholder:text-muted/60"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Senha
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        {mode === "login"
          ? "Não tem conta? Criar agora"
          : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (msg.includes("already registered"))
    return "Este e-mail já tem conta. Faça login.";
  if (msg.includes("Password should be at least"))
    return "A senha precisa ter no mínimo 6 caracteres.";
  return msg;
}
