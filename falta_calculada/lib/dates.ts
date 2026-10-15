/** Helpers de data — tudo em "YYYY-MM-DD" local para evitar problemas de fuso. */

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function weekdayOf(key: string): number {
  return parseDateKey(key).getDay();
}

/** Itera dias (inclusive) no formato key. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const end = parseDateKey(to);
  for (let d = parseDateKey(from); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(toDateKey(d));
  }
  return days;
}

export function addDaysKey(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function fmtDayMonth(key: string): string {
  return parseDateKey(key).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function fmtLongDate(key: string): string {
  return parseDateKey(key).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

/** "07:00" → "7h" */
export function formatTime(t: string): string {
  const [h] = t.split(":").map(Number);
  return `${h}h`;
}

/** Diferença em horas entre "HH:MM" e "HH:MM". */
export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
