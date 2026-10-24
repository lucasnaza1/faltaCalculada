"use client";

/** Hook de conveniência: dados visíveis no momento (meus ou do parceiro).
 * Quando exibindo o parceiro, readOnly=true — a UI bloqueia mutações. */

import { useSyncExternalStore } from "react";
import type { AppData } from "./types";
import { getSnapshot, getServerSnapshot, subscribe } from "./store";
import { useSync } from "./sync";

export function useAppData(): { data: AppData; readOnly: boolean } {
  const { partnerData, viewingPartner } = useSync();
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (viewingPartner && partnerData) return { data: partnerData, readOnly: true };
  return { data: local, readOnly: false };
}
