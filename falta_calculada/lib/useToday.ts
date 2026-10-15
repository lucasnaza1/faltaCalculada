"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "./dates";

const subscribe = () => () => {};

/** Data de hoje resolvida apenas no cliente (null no servidor/prerender),
 * sem setState em effect — compatível com cacheComponents do Next.js 16. */
export function useToday(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => todayKey(),
    () => null,
  );
}
