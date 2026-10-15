/** Modelo de dados — faltaCalculada (guide seção 4) */

export type EventType =
  | "HOLIDAY"
  | "CANCELLED"
  | "EXTRA_CLASS"
  | "REPLACEMENT"
  | "STRIKE"
  | "SCHEDULE_CHANGE";

export interface ScheduleSlot {
  id: string;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "HH:MM" */
  start: string;
  end: string;
}

export interface Absence {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** nº de horários (1 horário = 1 falta) */
  classesCount: number;
  justified: boolean;
  note?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  workloadHours: number;
  professor?: string;
  slots: ScheduleSlot[];
  absences: Absence[];
}

export interface CalendarEvent {
  id: string;
  type: EventType;
  /** "YYYY-MM-DD" */
  date: string;
  endDate?: string;
  /** null/undefined = todas as matérias */
  subjectId?: string | null;
  classesCount?: number;
  note?: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  archived: boolean;
  subjects: Subject[];
  events: CalendarEvent[];
}

export interface Settings {
  /** 0.75 = frequência mínima padrão (75%) */
  minAttendance: number;
  /** alerta quando restar ≤ N faltas */
  alertThreshold: number;
  /** faltas justificadas abatem do contador? */
  justifiedCounts: boolean;
}

export interface AppData {
  version: number;
  settings: Settings;
  semesters: Semester[];
  activeSemesterId: string;
}

export type RiskLevel = "safe" | "warning" | "danger";

export const EVENT_LABELS: Record<EventType, string> = {
  HOLIDAY: "Feriado / recesso",
  CANCELLED: "Aula cancelada",
  EXTRA_CLASS: "Aula extra",
  REPLACEMENT: "Reposição",
  STRIKE: "Greve / paralisação",
  SCHEDULE_CHANGE: "Horário trocado",
};
