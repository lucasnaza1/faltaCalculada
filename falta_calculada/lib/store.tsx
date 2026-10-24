"use client";

/** Store local (localStorage) via useSyncExternalStore — o localStorage é a
 * "fonte externa de verdade" e o cache em memória mantém a referência estável. */

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { seedData } from "./seed";
import type { AppData, CalendarEvent, Semester, Subject } from "./types";

const STORAGE_KEY = "falta-calculada:v1";

let cache: AppData | null = null;
const listeners = new Set<() => void>();

function readStorage(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const data = JSON.parse(raw) as AppData;
    if (!data.semesters?.length) return seedData();
    return data;
  } catch {
    return seedData();
  }
}

function getSnapshot(): AppData {
  if (cache === null) cache = readStorage();
  return cache;
}
export { getSnapshot };

/** Snapshot do servidor memoizado — referência estável evita re-render infinito
 * durante a hidratação (cliente troca para getSnapshot logo em seguida). */
let serverCache: AppData | null = null;

function getServerSnapshot(): AppData {
  if (serverCache === null) serverCache = seedData();
  return serverCache;
}
export { getServerSnapshot };

function persist(next: AppData, opts?: { fromSync?: boolean }) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota cheia / modo privado: segue funcionando em memória
  }
  for (const l of listeners) l();
  if (!opts?.fromSync) for (const l of mutationListeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export { subscribe };

/** Notificado a cada mutação local (o SyncProvider faz o push). */
const mutationListeners = new Set<() => void>();

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Store {
  data: AppData;
  activeSemester: Semester;
  updateActiveSemester: (fn: (s: Semester) => Semester) => void;
  addAbsence: (
    subjectId: string,
    date: string,
    classesCount: number,
    justified?: boolean,
    note?: string,
  ) => void;
  removeAbsence: (subjectId: string, absenceId: string) => void;
  updateSubject: (
    subjectId: string,
    patch: Partial<Omit<Subject, "id" | "slots" | "absences">>,
  ) => void;
  upsertSubject: (subject: Subject) => void;
  deleteSubject: (subjectId: string) => void;
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  removeEvent: (eventId: string) => void;
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  resetToSeed: () => void;
}

/** Substitui o documento local por um vindo do servidor (pull). */
export function replaceData(next: AppData) {
  persist(next, { fromSync: true });
}

/** Assina mutações locais (para o SyncProvider fazer push debounced). */
export function subscribeMutations(listener: () => void): () => void {
  mutationListeners.add(listener);
  return () => {
    mutationListeners.delete(listener);
  };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const store = useMemo<Store>(() => {
    const mutate = (fn: (d: AppData) => AppData) => persist(fn(getSnapshot()));

    const updateActiveSemester = (fn: (s: Semester) => Semester) =>
      mutate((d) => ({
        ...d,
        semesters: d.semesters.map((s) =>
          s.id === d.activeSemesterId ? fn(s) : s,
        ),
      }));

    const mapSubject = (subjectId: string, fn: (s: Subject) => Subject) =>
      updateActiveSemester((sem) => ({
        ...sem,
        subjects: sem.subjects.map((s) => (s.id === subjectId ? fn(s) : s)),
      }));

    return {
      data,
      activeSemester:
        data.semesters.find((s) => s.id === data.activeSemesterId) ??
        data.semesters[0],
      updateActiveSemester,
      addAbsence: (subjectId, date, classesCount, justified = false, note) =>
        mapSubject(subjectId, (s) => ({
          ...s,
          absences: [
            ...s.absences,
            { id: uid("abs"), date, classesCount, justified, note },
          ],
        })),
      removeAbsence: (subjectId, absenceId) =>
        mapSubject(subjectId, (s) => ({
          ...s,
          absences: s.absences.filter((a) => a.id !== absenceId),
        })),
      updateSubject: (subjectId, patch) =>
        mapSubject(subjectId, (s) => ({ ...s, ...patch })),
      upsertSubject: (subject) =>
        updateActiveSemester((sem) => ({
          ...sem,
          subjects: sem.subjects.some((s) => s.id === subject.id)
            ? sem.subjects.map((s) => (s.id === subject.id ? subject : s))
            : [...sem.subjects, subject],
        })),
      deleteSubject: (subjectId) =>
        updateActiveSemester((sem) => ({
          ...sem,
          subjects: sem.subjects.filter((s) => s.id !== subjectId),
          events: sem.events.filter((e) => e.subjectId !== subjectId),
        })),
      addEvent: (event) =>
        updateActiveSemester((sem) => ({
          ...sem,
          events: [...sem.events, { ...event, id: uid("ev") }],
        })),
      removeEvent: (eventId) =>
        updateActiveSemester((sem) => ({
          ...sem,
          events: sem.events.filter((e) => e.id !== eventId),
        })),
      updateSettings: (patch) =>
        mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      resetToSeed: () => persist(seedData()),
    };
  }, [data]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>");
  return ctx;
}
