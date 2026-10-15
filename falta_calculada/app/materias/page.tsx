"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { SubjectCard } from "@/components/SubjectCard";
import { sortByRisk, subjectStats } from "@/lib/calc";
import { WEEKDAY_SHORT } from "@/lib/dates";
import { uid, useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import type { ScheduleSlot, Subject } from "@/lib/types";

const COLORS = [
  "#FF4D8D",
  "#3DDC97",
  "#FFC857",
  "#8FB8FF",
  "#C792EA",
  "#FF8A5C",
];

interface FormState {
  name: string;
  professor: string;
  color: string;
  workloadHours: string;
  slots: ScheduleSlot[];
}

const EMPTY_FORM: FormState = {
  name: "",
  professor: "",
  color: COLORS[0],
  workloadHours: "60",
  slots: [],
};

export default function MateriasPage() {
  const { data, activeSemester, upsertSubject, deleteSubject } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const today = useToday();

  if (!data || !activeSemester || !today) {
    return <p className="pt-10 text-center text-muted">Carregando…</p>;
  }

  const stats = activeSemester.subjects.map((s) =>
    subjectStats(s, activeSemester, data.settings, today),
  );
  const ordered = sortByRisk(stats);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({
      name: subject.name,
      professor: subject.professor ?? "",
      color: subject.color,
      workloadHours: String(subject.workloadHours),
      slots: subject.slots.map((s) => ({ ...s })),
    });
    setError(null);
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const workload = Number(form.workloadHours);
    if (!name) {
      setError("Informe o nome da matéria.");
      return;
    }
    if (!Number.isFinite(workload) || workload <= 0) {
      setError("Carga horária deve ser um número positivo.");
      return;
    }
    const invalidSlot = form.slots.find((s) => s.start >= s.end);
    if (invalidSlot) {
      setError("Cada horário precisa de início antes do fim (ex.: 08:00–10:00).");
      return;
    }
    upsertSubject({
      id: editing?.id ?? uid("subj"),
      name,
      professor: form.professor.trim() || undefined,
      color: form.color,
      workloadHours: workload,
      slots: form.slots,
      absences: editing?.absences ?? [],
    });
    setModalOpen(false);
  }

  function fmtSlot(s: ScheduleSlot): string {
    return `${WEEKDAY_SHORT[s.weekday]} ${s.start}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matérias</h1>
          <p className="mt-1 text-sm text-muted">
            {activeSemester.subjects.length} em {activeSemester.name}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-soft hover:text-black"
        >
          <Plus className="h-4 w-4" aria-hidden /> Nova
        </button>
      </header>

      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-muted">
          Nenhuma matéria ainda. Toque em “Nova” para cadastrar.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordered.map((s) => (
            <li key={s.subject.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => openEdit(s.subject)}
                className="w-full text-left"
                aria-label={`Editar ${s.subject.name}`}
              >
                <SubjectCard stats={s} />
              </button>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted">
                  {s.subject.slots.length > 0
                    ? s.subject.slots.map(fmtSlot).join(" · ")
                    : "Sem horários cadastrados"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Excluir ${s.subject.name}? As faltas também serão removidas.`,
                      )
                    ) {
                      deleteSubject(s.subject.id);
                    }
                  }}
                  aria-label={`Excluir ${s.subject.name}`}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar matéria" : "Nova matéria"}
      >
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm">
            Nome
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex.: Cirurgia"
              autoFocus
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 placeholder:text-muted/60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Professor (opcional)
            <input
              type="text"
              value={form.professor}
              onChange={(e) =>
                setForm((f) => ({ ...f, professor: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5 placeholder:text-muted/60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            Carga horária (horas)
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.workloadHours}
              onChange={(e) =>
                setForm((f) => ({ ...f, workloadHours: e.target.value }))
              }
              className="rounded-xl border border-white/10 bg-surface-raised px-3 py-2.5"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">
              Dias e horários de aula
              <span className="ml-1 text-xs text-muted">
                (cada 1h de aula = 1 falta)
              </span>
            </legend>
            <ul className="flex flex-col gap-2">
              {form.slots.map((slot, i) => (
                <li key={slot.id} className="flex items-center gap-2">
                  <select
                    value={slot.weekday}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slots: f.slots.map((s, j) =>
                          j === i
                            ? { ...s, weekday: Number(e.target.value) }
                            : s,
                        ),
                      }))
                    }
                    aria-label={`Dia da aula ${i + 1}`}
                    className="w-20 rounded-xl border border-white/10 bg-surface-raised px-2 py-2.5 text-sm"
                  >
                    {WEEKDAY_SHORT.map((d, w) => (
                      <option key={d} value={w}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slots: f.slots.map((s, j) =>
                          j === i ? { ...s, start: e.target.value } : s,
                        ),
                      }))
                    }
                    aria-label={`Início da aula ${i + 1}`}
                    className="w-[5.5rem] rounded-xl border border-white/10 bg-surface-raised px-2 py-2.5 text-sm"
                  />
                  <span className="text-muted" aria-hidden>–</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slots: f.slots.map((s, j) =>
                          j === i ? { ...s, end: e.target.value } : s,
                        ),
                      }))
                    }
                    aria-label={`Fim da aula ${i + 1}`}
                    className="w-[5.5rem] rounded-xl border border-white/10 bg-surface-raised px-2 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        slots: f.slots.filter((_, j) => j !== i),
                      }))
                    }
                    aria-label={`Remover horário ${WEEKDAY_SHORT[slot.weekday]} ${slot.start}`}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  slots: [
                    ...f.slots,
                    { id: uid("slot"), weekday: 1, start: "08:00", end: "10:00" },
                  ],
                }))
              }
              className="flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-white/20 px-3 py-2 text-sm text-muted transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden /> Adicionar horário
            </button>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Cor</legend>
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={`Cor ${c}`}
                  aria-pressed={form.color === c}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    form.color === c ? "scale-110 border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

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
