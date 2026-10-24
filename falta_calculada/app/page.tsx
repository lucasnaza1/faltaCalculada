"use client";

import Link from "next/link";
import { AlertTriangle, CalendarCheck, ChevronRight } from "lucide-react";
import { SubjectCard } from "@/components/SubjectCard";
import { dayClasses, daySlots, semesterHolidays, sortByRisk, subjectStats } from "@/lib/calc";
import { fmtLongDate } from "@/lib/dates";
import { useAppData } from "@/lib/useAppData";
import { useToday } from "@/lib/useToday";

export default function HomePage() {
  const { data, readOnly } = useAppData();
  const today = useToday();

  if (!data || !today) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">Carregando…</p>
      </div>
    );
  }

  const activeSemester =
    data.semesters.find((s) => s.id === data.activeSemesterId) ??
    data.semesters[0];

  const holidays = semesterHolidays(activeSemester);
  const stats = activeSemester.subjects.map((s) =>
    subjectStats(s, activeSemester, data.settings, today),
  );
  const ordered = sortByRisk(stats);

  const todaySubjects = activeSemester.subjects
    .map((subject) => {
      const hours = dayClasses(subject, activeSemester, holidays, today);
      const slots = daySlots(subject, today);
      return { subject, hours, slots };
    })
    .filter((e) => e.hours > 0);

  const riskAlerts = ordered.filter((s) => s.risk !== "safe");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          falta<span className="text-primary">Calculada</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {activeSemester.name} · {fmtLongDate(today)}
        </p>
      </header>

      {riskAlerts.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-warning">Atenção</p>
            <p className="text-foreground/90">
              {riskAlerts
                .map(
                  (s) =>
                    `${s.subject.name}: ${s.remaining} ${s.remaining === 1 ? "falta resta" : "faltas restam"}`,
                )
                .join(" · ")}
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="aulas-hoje">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="aulas-hoje" className="text-sm font-semibold uppercase tracking-wide text-muted">
            Aulas de hoje
          </h2>
          {!readOnly && (
            <Link
              href="/registrar"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-soft"
            >
              Registrar falta <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>

        {holidays.has(today) ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-4 text-sm text-muted">
            <CalendarCheck className="h-5 w-5 text-success" aria-hidden />
            Hoje é {holidays.get(today)} — sem aulas.
          </div>
        ) : todaySubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted">
            Nenhuma aula hoje. Descanso merecido.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {todaySubjects.map(({ subject, slots }) => (
              <li key={subject.id}>
                <Link
                  href={readOnly ? "#" : `/registrar?data=${today}`}
                  aria-disabled={readOnly}
                  onClick={(e) => readOnly && e.preventDefault()}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden
                    />
                    <div>
                      <p className="font-semibold">{subject.name}</p>
                      <p className="text-xs text-muted">
                        {slots.map((s) => `${s.slot.start}–${s.slot.end}`).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    Faltei
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="materias">
        <h2 id="materias" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Matérias por risco
        </h2>
        <ul className="flex flex-col gap-3">
          {ordered.map((s) => (
            <li key={s.subject.id}>
              <SubjectCard stats={s} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
