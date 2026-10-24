"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  dayClasses,
  daySlots,
  semesterHolidays,
  subjectStats,
} from "@/lib/calc";
import {
  addDaysKey,
  fmtLongDate,
  hoursBetween,
} from "@/lib/dates";
import { useAppData } from "@/lib/useAppData";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";

export default function RegistrarPage() {
  const { data, readOnly } = useAppData();
  const { addAbsence, removeAbsence } = useStore();
  const today = useToday();
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  // até montar, usa a data de referência do seed; depois, hoje
  const date = dateOverride ?? today ?? "2026-10-14";
  const setDate = setDateOverride;
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeSemester =
    data?.semesters.find((s) => s.id === data.activeSemesterId) ??
    data?.semesters[0];

  const dayInfo = useMemo(() => {
    if (!data || !activeSemester) return null;
    const holidays = semesterHolidays(activeSemester);
    const entries = activeSemester.subjects
      .map((subject) => ({
        subject,
        hours: dayClasses(subject, activeSemester, holidays, date),
        slots: daySlots(subject, date),
      }))
      .filter((e) => e.hours > 0);
    return { entries, holiday: holidays.get(date) ?? null };
  }, [data, activeSemester, date]);

  if (!data || !activeSemester || !dayInfo) {
    return <p className="pt-10 text-center text-muted">Carregando…</p>;
  }

  function register(subjectId: string, classesCount: number) {
    if (readOnly) return;
    addAbsence(subjectId, date, classesCount);
    const subject = activeSemester!.subjects.find((s) => s.id === subjectId);
    setFeedback(`Falta registrada em ${subject?.name} ✓`);
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Registrar falta</h1>
        <p className="mt-1 text-sm text-muted">Marque os horários que faltou</p>
      </header>

      <div className="flex items-center justify-between gap-2" role="group" aria-label="Escolher data">
        <button
          type="button"
          onClick={() => setDate(addDaysKey(date, -1))}
          aria-label="Dia anterior"
          className="rounded-xl border border-white/10 bg-surface p-2.5 text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-center text-sm font-medium capitalize-first">
          {fmtLongDate(date)}
        </p>
        <button
          type="button"
          onClick={() => setDate(addDaysKey(date, 1))}
          aria-label="Próximo dia"
          className="rounded-xl border border-white/10 bg-surface p-2.5 text-muted transition-colors hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {feedback && (
        <p role="status" className="rounded-xl bg-success/15 px-4 py-2 text-center text-sm font-medium text-success">
          {feedback}
        </p>
      )}

      {dayInfo.holiday ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted">
          {dayInfo.holiday} — sem aulas neste dia.
        </div>
      ) : dayInfo.entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted">
          Nenhuma aula prevista neste dia.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {dayInfo.entries.map(({ subject, slots }) => {
            const stats = subjectStats(subject, activeSemester, data.settings, date);
            const alreadyAbsent = subject.absences.some((a) => a.date === date);
            return (
              <li
                key={subject.id}
                className="rounded-2xl border border-white/10 bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden
                    />
                    <div>
                      <p className="font-semibold">{subject.name}</p>
                      <p className="text-xs text-muted">
                        {stats.remaining} faltas restam · limite {stats.limit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {slots.map(({ slot }) => {
                    const hours = hoursBetween(slot.start, slot.end);
                    const marked = subject.absences.some(
                      (a) => a.date === date && a.classesCount === hours,
                    );
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          marked
                            ? removeAbsence(
                                subject.id,
                                subject.absences.find(
                                  (a) =>
                                    a.date === date && a.classesCount === hours,
                                )!.id,
                              )
                            : register(subject.id, hours)
                        }
                        aria-pressed={marked}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          marked
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-white/10 bg-surface-raised text-foreground hover:border-primary/40"
                        }`}
                      >
                        {marked && <Check className="h-4 w-4" aria-hidden />}
                        {slot.start}–{slot.end}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      const total = slots.reduce((s, e) => s + e.hours, 0);
                      register(subject.id, total);
                    }}
                    className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                  >
                    Faltei o dia todo
                  </button>
                </div>

                {alreadyAbsent && (
                  <p className="mt-2 text-xs text-muted">
                    Já existe falta registrada neste dia — toque no horário para
                    desmarcar.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
