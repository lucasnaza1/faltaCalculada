"use client";

import { fmtPct, riskColor, type SubjectStats } from "@/lib/calc";

export function SubjectCard({ stats }: { stats: SubjectStats }) {
  const { subject, used, limit, remaining, currentFrequency, risk } = stats;
  const pct = limit > 0 ? Math.min(used / limit, 1) : 1;
  const color = riskColor(risk);

  return (
    <article
      className="rounded-2xl border border-white/10 bg-surface p-4"
      aria-label={subject.name}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: subject.color }}
            aria-hidden
          />
          <div>
            <h3 className="font-semibold leading-tight">{subject.name}</h3>
            <p className="text-xs text-muted">
              {subject.workloadHours}h · máx {limit} faltas
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none" style={{ color }}>
            {remaining}
          </p>
          <p className="text-[11px] text-muted">restam</p>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${used} de ${limit} faltas usadas em ${subject.name}`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {used} de {limit} faltas usadas · frequência atual{" "}
        <span className="text-foreground">{fmtPct(currentFrequency)}</span>
      </p>
    </article>
  );
}
