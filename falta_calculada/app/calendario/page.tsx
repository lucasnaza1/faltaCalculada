"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { semesterHolidays } from "@/lib/calc";
import { monthLabel, parseDateKey, toDateKey } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { EVENT_LABELS, type EventType } from "@/lib/types";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const EVENT_TYPES: EventType[] = [
  "HOLIDAY",
  "CANCELLED",
  "EXTRA_CLASS",
  "REPLACEMENT",
  "STRIKE",
  "SCHEDULE_CHANGE",
];

export default function CalendarioPage() {
  const { data, activeSemester, addEvent, removeEvent } = useStore();
  const today = useToday();
  // cursor do mês derivado de "hoje" no cliente; usuário navega a partir dele
  const [cursorOverride, setCursorOverride] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const defaultCursor = useMemo(
    () => ({
      year: today ? Number(today.slice(0, 4)) : 2026,
      month: today ? Number(today.slice(5, 7)) - 1 : 9,
    }),
    [today],
  );
  const cursor = cursorOverride ?? defaultCursor;
  const [selected, setSelected] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    type: EventType;
    subjectId: string;
    note: string;
  }>({ type: "HOLIDAY", subjectId: "", note: "" });

  const monthDays = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const lead = first.getDay();
    const cells: Array<{ key: string; date: string | null }> = [];
    for (let i = 0; i < lead; i++) {
      cells.push({ key: `lead-${i}`, date: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = toDateKey(new Date(cursor.year, cursor.month, d));
      cells.push({ key: date, date });
    }
    return cells;
  }, [cursor]);

  const holidays = useMemo(
    () => (activeSemester ? semesterHolidays(activeSemester) : new Map()),
    [activeSemester],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof activeSemester>["events"]>();
    for (const ev of activeSemester?.events ?? []) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [activeSemester]);

  if (!data || !activeSemester) {
    return <p className="pt-10 text-center text-muted">Carregando…</p>;
  }

  function prevMonth() {
    const { year, month } = cursor;
    setCursorOverride(
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }

  function nextMonth() {
    const { year, month } = cursor;
    setCursorOverride(
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : [];
  const selectedHoliday = selected ? (holidays.get(selected) ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
        <p className="mt-1 text-sm text-muted">
          Feriados nacionais já valem automaticamente
        </p>
      </header>

      <div className="flex items-center justify-between" role="group" aria-label="Mês">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mês anterior"
          className="rounded-xl border border-white/10 bg-surface p-2.5 text-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-sm font-semibold capitalize-first">
          {monthLabel(cursor.year, cursor.month)}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Próximo mês"
          className="rounded-xl border border-white/10 bg-surface p-2.5 text-muted hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={`wd-${i}`}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map(({ key, date }) => {
          if (!date) return <span key={key} aria-hidden />;
          const isSelected = date === selected;
          const isTodayMark =
            today === date && !isSelected ? (
              <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden />
            ) : null;
          const isHoliday = holidays.has(date);
          const hasEvents = eventsByDate.has(date);
          const inSemester =
            activeSemester.startDate <= date && date <= activeSemester.endDate;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(date)}
              aria-pressed={isSelected}
              aria-label={isHoliday ? `${date}, feriado` : date}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : isHoliday
                    ? "bg-danger/15 text-danger"
                    : hasEvents
                      ? "bg-warning/15 text-warning"
                      : inSemester
                        ? "text-foreground hover:bg-white/5"
                        : "text-muted/40"
              }`}
            >
              {Number(date.slice(8, 10))}
              {isTodayMark}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger/60" aria-hidden /> Feriado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning/60" aria-hidden /> Alteração
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden /> Hoje
        </span>
      </div>

      {selected && (
        <section
          aria-label={`Detalhes do dia ${selected}`}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold capitalize-first">
              {parseDateKey(selected).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <button
              type="button"
              onClick={() => {
                setForm({ type: "HOLIDAY", subjectId: "", note: "" });
                setModalOpen(true);
              }}
              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black"
            >
              <Plus className="h-4 w-4" aria-hidden /> Alteração
            </button>
          </div>

          {selectedHoliday && (
            <p className="text-sm text-danger">{selectedHoliday} (feriado nacional)</p>
          )}

          {selectedEvents.length === 0 && !selectedHoliday && (
            <p className="text-sm text-muted">Nenhuma alteração neste dia.</p>
          )}

          <ul className="flex flex-col gap-2">
            {selectedEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2 text-sm"
              >
                <span>
                  {EVENT_LABELS[ev.type]}
                  {ev.subjectId &&
                    ` · ${activeSemester.subjects.find((s) => s.id === ev.subjectId)?.name ?? ""}`}
                  {ev.note ? ` — ${ev.note}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeEvent(ev.id)}
                  aria-label={`Remover ${EVENT_LABELS[ev.type]}`}
                  className="text-xs text-muted underline transition-colors hover:text-danger"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova alteração">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected) return;
            addEvent({
              type: form.type,
              date: selected,
              subjectId: form.subjectId || null,
              note: form.note.trim() || undefined,
            });
            setModalOpen(false);
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            Tipo
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as EventType }))
              }
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Matéria (opcional — vazio afeta todas)
            <select
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5"
            >
              <option value="">Todas as matérias</option>
              {activeSemester.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Observação (opcional)
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ex.: ponte, semana acadêmica…"
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 placeholder:text-muted/60"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black"
          >
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
