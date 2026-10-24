"use client";

/** SyncProvider — sincroniza o documento AppData com o Supabase.
 *
 * Estratégia document-based (1 linha JSONB por usuário):
 * - Pull ao logar / ao focar o app: se a nuvem tem documento, adota.
 * - Push debounced após mutações locais.
 * - Primeiro login com localStorage populado e nuvem vazia → sobe o local.
 * - Poll do parceiro (60s + foco) alimenta o modo leitura.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppData } from "./types";
import { getSnapshot, replaceData, subscribeMutations } from "./store";
import { getSupabase } from "./supabase";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface PartnerInfo {
  userId: string;
  displayName: string;
}

interface SyncState {
  session: Session | null;
  ready: boolean;
  /** false quando as env vars do Supabase não existem (dev sem sync) */
  configured: boolean;
  status: SyncStatus;
  partner: PartnerInfo | null;
  partnerData: AppData | null;
  /** true quando a UI está exibindo os dados do parceiro (somente leitura) */
  viewingPartner: boolean;
  setViewingPartner: (v: boolean) => void;
  /** modo leitura: mutações bloqueadas */
  readOnly: boolean;
  refreshPartner: () => void;
  signOut: () => Promise<void>;
}

const SyncContext = createContext<SyncState | null>(null);

const PUSH_DEBOUNCE_MS = 1500;
const PARTNER_POLL_MS = 60_000;
const STORAGE_KEY = "falta-calculada:v1";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  // ready=true por padrão: quando o Supabase não está configurado,
  // o app funciona local sem esperar sessão; com cliente, o efeito
  // de sessão cuida do ciclo real (false durante o check inicial).
  const [ready, setReady] = useState(() => !getSupabase());
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [partnerData, setPartnerData] = useState<AppData | null>(null);
  const [viewingPartner, setViewingPartnerState] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const setViewingPartner = useCallback((v: boolean) => {
    setViewingPartnerState(v);
  }, []);

  // ---------------------------------------------------------------- sessão
  useEffect(() => {
    if (!supabase) {
      // sem env vars: app 100% local, sem sync (ready já nasce true)
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .finally(() => setReady(true));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // --------------------------------------------------------- push (debounce)
  const push = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !supabase) return;
    setStatus("syncing");
    const { error } = await supabase.from("app_data").upsert({
      user_id: s.user.id,
      data: getSnapshot(),
      updated_at: new Date().toISOString(),
    });
    setStatus(error ? "error" : "synced");
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    return subscribeMutations(() => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
    });
  }, [session, push]);

  // ------------------------------------------------------------- pull (login)
  const pull = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !supabase || pulling.current) return;
    // se há push pendente, não sobrescreve o local com o remoto (evita perder edição)
    if (pushTimer.current) return;
    pulling.current = true;
    setStatus("syncing");
    try {
      const { data: remote, error } = await supabase
        .from("app_data")
        .select("data")
        .eq("user_id", s.user.id)
        .maybeSingle();

      if (error) throw error;

      const localHasData = (() => {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return !!raw && (JSON.parse(raw) as AppData).semesters?.length > 0;
        } catch {
          return false;
        }
      })();

      if (remote?.data) {
        replaceData(remote.data as AppData);
        setStatus("synced");
      } else if (localHasData) {
        // primeiro login: sobe o localStorage (migração, sem perder dados)
        const { error: upErr } = await supabase.from("app_data").upsert({
          user_id: s.user.id,
          data: getSnapshot(),
          updated_at: new Date().toISOString(),
        });
        setStatus(upErr ? "error" : "synced");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
    } finally {
      pulling.current = false;
    }
  }, [supabase]);

  // --------------------------------------------------------- parceiro (poll)
  const loadPartner = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !supabase) return;
    try {
      const { data: couple } = await supabase
        .from("couples")
        .select("user_a, user_b")
        .or(`user_a.eq.${s.user.id},user_b.eq.${s.user.id}`)
        .maybeSingle();

      if (!couple) {
        setPartner(null);
        setPartnerData(null);
        setViewingPartnerState(false);
        return;
      }

      const partnerId =
        couple.user_a === s.user.id ? couple.user_b : couple.user_a;

      const [{ data: profile }, { data: pData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", partnerId)
          .maybeSingle(),
        supabase
          .from("app_data")
          .select("data")
          .eq("user_id", partnerId)
          .maybeSingle(),
      ]);

      setPartner({
        userId: partnerId,
        displayName: profile?.display_name || "Parceiro(a)",
      });
      setPartnerData((pData?.data as AppData) ?? null);
    } catch {
      // silencioso: o próximo poll tenta de novo
    }
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    // agendado fora do corpo do effect (evita cascata de setState síncrono)
    const kick = setTimeout(() => {
      void pull();
      void loadPartner();
    }, 0);
    const id = setInterval(() => {
      void pull();
      void loadPartner();
    }, PARTNER_POLL_MS);
    const onFocus = () => {
      void pull();
      void loadPartner();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, pull, loadPartner]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setPartner(null);
    setPartnerData(null);
    setViewingPartnerState(false);
  }, [supabase]);

  const value = useMemo<SyncState>(
    () => ({
      session,
      ready,
      configured: !!supabase,
      status,
      partner,
      partnerData,
      viewingPartner: viewingPartner && !!partnerData,
      setViewingPartner,
      readOnly: viewingPartner && !!partnerData,
      refreshPartner: () => void loadPartner(),
      signOut,
    }),
    [
      session,
      ready,
      supabase,
      status,
      partner,
      partnerData,
      viewingPartner,
      setViewingPartner,
      loadPartner,
      signOut,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync deve ser usado dentro de <SyncProvider>");
  return ctx;
}
