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
  useSyncExternalStore,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppData } from "./types";
import {
  getSnapshot,
  getServerSnapshot,
  replaceData,
  subscribe,
  subscribeMutations,
} from "./store";
import { getSupabase } from "./supabase";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface PartnerInfo {
  userId: string;
  displayName: string;
}

interface SyncState {
  session: Session | null;
  ready: boolean;
  status: SyncStatus;
  partner: PartnerInfo | null;
  partnerData: AppData | null;
  /** documento local do usuário logado (para checagens de UI) */
  sessionData: AppData | null;
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
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [partnerData, setPartnerData] = useState<AppData | null>(null);
  /** documento local (do usuário logado) — espelha o store para a UI */
  const localData = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
    if (!s) return;
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
    if (!s || pulling.current) return;
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

      /** peso do documento: nº de registros reais (matérias + faltas + eventos) */
      const docWeight = (d: AppData | null | undefined): number => {
        if (!d?.semesters?.length) return -1;
        let w = 0;
        for (const sem of d.semesters) {
          w += sem.subjects.length;
          for (const sub of sem.subjects) w += sub.absences.length;
          w += sem.events.length;
        }
        return w;
      };

      const localDoc = getSnapshot();
      const localHasData = (() => {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          return !!raw && (JSON.parse(raw) as AppData).semesters?.length > 0;
        } catch {
          return false;
        }
      })();

      const remoteDoc = (remote?.data as AppData) ?? null;
      const remoteW = docWeight(remoteDoc);
      const localW = localHasData ? docWeight(localDoc) : -1;

      if (remoteDoc && remoteW >= localW) {
        // nuvem igual ou mais completa → adota
        replaceData(remoteDoc);
        setStatus("synced");
      } else if (localHasData && localW > remoteW) {
        // local mais completo (ex.: login em conta nova com histórico local,
        // ou nuvem vazia/só-seed) → sobe o local
        const { error: upErr } = await supabase.from("app_data").upsert({
          user_id: s.user.id,
          data: localDoc,
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
    if (!s) return;
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
    await supabase.auth.signOut();
    setPartner(null);
    setPartnerData(null);
    setViewingPartnerState(false);
  }, [supabase]);

  const value = useMemo<SyncState>(
    () => ({
      session,
      ready,
      status,
      partner,
      partnerData,
      sessionData: localData,
      viewingPartner: viewingPartner && !!partnerData,
      setViewingPartner,
      readOnly: viewingPartner && !!partnerData,
      refreshPartner: () => void loadPartner(),
      signOut,
    }),
    [
      session,
      ready,
      status,
      partner,
      partnerData,
      localData,
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
