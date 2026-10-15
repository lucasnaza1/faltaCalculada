/** Motor de cálculo — regras da seção 2 do guide.
 *
 * Decisões fechadas:
 * - Falta por horário (1h de carga horária = 1 falta)
 * - Limite = floor(carga × (1 − frequência_mínima)), sobre a carga OFICIAL (fixa)
 * - Feriados/cancelamentos alteram aulas previstas (projeção), não o limite
 */

import { eachDay, hoursBetween, weekdayOf } from "./dates";
import { nationalHolidays } from "./holidays";
import type {
  CalendarEvent,
  RiskLevel,
  ScheduleSlot,
  Semester,
  Settings,
  Subject,
} from "./types";

export function absenceLimit(subject: Subject, settings: Settings): number {
  return Math.floor(subject.workloadHours * (1 - settings.minAttendance));
}

/** Faltas consumidas (justificadas podem abater, conforme configuração). */
export function usedAbsences(subject: Subject, settings: Settings): number {
  return subject.absences.reduce(
    (sum, a) =>
      sum + (a.justified && !settings.justifiedCounts ? 0 : a.classesCount),
    0,
  );
}

/** Feriados nacionais que caem dentro do semestre (auto-aplicados). */
export function semesterHolidays(semester: Semester): Map<string, string> {
  const years = new Set<number>([
    Number(semester.startDate.slice(0, 4)),
    Number(semester.endDate.slice(0, 4)),
  ]);
  const map = new Map<string, string>();
  for (const y of years) {
    for (const h of nationalHolidays(y)) {
      if (h.date >= semester.startDate && h.date <= semester.endDate) {
        map.set(h.date, h.name);
      }
    }
  }
  return map;
}

function eventAppliesToDay(ev: CalendarEvent, day: string): boolean {
  if (ev.endDate) return day >= ev.date && day <= ev.endDate;
  return day === ev.date;
}

/** Horários previstos de uma matéria num dia específico (grade + eventos). */
export function dayClasses(
  subject: Subject,
  semester: Semester,
  holidays: Map<string, string>,
  day: string,
): number {
  if (day < semester.startDate || day > semester.endDate) return 0;
  if (holidays.has(day)) return 0;

  const weekday = weekdayOf(day);
  let hours = subject.slots
    .filter((s) => s.weekday === weekday)
    .reduce((sum, s) => sum + hoursBetween(s.start, s.end), 0);

  for (const ev of semester.events) {
    if (!eventAppliesToDay(ev, day)) continue;
    if (ev.subjectId && ev.subjectId !== subject.id) continue;
    switch (ev.type) {
      case "HOLIDAY":
      case "STRIKE":
      case "CANCELLED":
        return 0;
      case "EXTRA_CLASS":
      case "REPLACEMENT":
        hours += ev.classesCount ?? 1;
        break;
      case "SCHEDULE_CHANGE":
        hours = ev.classesCount ?? hours;
        break;
    }
  }
  return hours;
}

/** Aulas previstas de uma matéria num dia específico (para exibição na lista do dia). */
export function daySlots(
  subject: Subject,
  day: string,
): Array<{ slot: ScheduleSlot; hours: number }> {
  const weekday = weekdayOf(day);
  return subject.slots
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => ({ slot: s, hours: hoursBetween(s.start, s.end) }));
}

export interface SubjectStats {
  subject: Subject;
  limit: number;
  used: number;
  remaining: number;
  /** aulas previstas no semestre inteiro */
  predictedTotal: number;
  /** aulas previstas até ontem */
  occurred: number;
  /** aulas previstas de hoje ao fim do semestre */
  upcoming: number;
  /** 0..1 (null se ainda não houve aula) */
  currentFrequency: number | null;
  /** 0..1 se faltar tudo daqui pra frente (null se sem aulas) */
  worstCaseFrequency: number | null;
  risk: RiskLevel;
}

export function subjectStats(
  subject: Subject,
  semester: Semester,
  settings: Settings,
  today: string,
): SubjectStats {
  const limit = absenceLimit(subject, settings);
  const used = usedAbsences(subject, settings);
  const remaining = limit - used;

  const holidays = semesterHolidays(semester);
  let predictedTotal = 0;
  let occurred = 0;
  let upcoming = 0;
  for (const day of eachDay(semester.startDate, semester.endDate)) {
    const hours = dayClasses(subject, semester, holidays, day);
    predictedTotal += hours;
    if (day < today) occurred += hours;
    else upcoming += hours;
  }

  const currentFrequency =
    occurred > 0 ? (occurred - used) / occurred : null;
  const worstCaseFrequency =
    predictedTotal > 0 ? (occurred - used) / predictedTotal : null;

  const risk: RiskLevel =
    remaining <= settings.alertThreshold
      ? "danger"
      : remaining <= Math.ceil(limit * 0.5)
        ? "warning"
        : "safe";

  return {
    subject,
    limit,
    used,
    remaining,
    predictedTotal,
    occurred,
    upcoming,
    currentFrequency,
    worstCaseFrequency,
    risk,
  };
}

export function riskColor(risk: RiskLevel): string {
  return risk === "danger"
    ? "var(--color-danger)"
    : risk === "warning"
      ? "var(--color-warning)"
      : "var(--color-success)";
}

/** Ordena por risco: perigo primeiro, depois menos faltas restantes. */
const RISK_ORDER: Record<RiskLevel, number> = {
  danger: 0,
  warning: 1,
  safe: 2,
};

export function sortByRisk(stats: SubjectStats[]): SubjectStats[] {
  return [...stats].sort(
    (a, b) =>
      RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || a.remaining - b.remaining,
  );
}

export function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100).toLocaleString("pt-BR")}%`;
}
