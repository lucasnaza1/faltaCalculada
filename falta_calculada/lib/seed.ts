/** Seed inicial — dados reais dela (guide seção 2.2).
 *
 * Semestre 2026.2: 15 semanas exatas de 03/08 (seg) a 15/11 (dom) = 105 dias.
 * Faltas já existentes entram como saldo inicial, distribuídas no passado.
 */

import type { AppData, Subject } from "./types";

const S = "seguro";

function slots(defs: Array<[number, string, string]>): Subject["slots"] {
  return defs.map(([weekday, start, end], i) => ({
    id: `slot-${S}-${weekday}-${start}-${i}`,
    weekday,
    start,
    end,
  }));
}

const SUBJECTS: Subject[] = [
  {
    id: "subj-cirurgia",
    name: "Cirurgia",
    color: "#FF4D8D",
    workloadHours: 90,
    slots: slots([
      [2, "08:00", "12:00"],
      [4, "08:00", "10:00"],
    ]),
    absences: [
      { id: "abs-c1", date: "2026-08-11", classesCount: 4, justified: false },
      { id: "abs-c2", date: "2026-08-25", classesCount: 4, justified: false },
    ],
  },
  {
    id: "subj-endo",
    name: "Endo",
    color: "#3DDC97",
    workloadHours: 90,
    slots: slots([
      [1, "10:00", "11:00"],
      [3, "08:00", "12:00"],
      [5, "08:00", "09:00"],
    ]),
    absences: [
      { id: "abs-e1", date: "2026-09-02", classesCount: 3, justified: false },
    ],
  },
  {
    id: "subj-perio",
    name: "Perio",
    color: "#FFC857",
    workloadHours: 60,
    slots: slots([
      [5, "08:00", "10:00"],
      [5, "14:00", "16:00"],
    ]),
    absences: [
      { id: "abs-p1", date: "2026-08-21", classesCount: 2, justified: false },
    ],
  },
  {
    id: "subj-orto",
    name: "Orto",
    color: "#8FB8FF",
    workloadHours: 90,
    slots: slots([
      [2, "08:00", "12:00"],
      [2, "19:00", "21:00"],
    ]),
    absences: [
      { id: "abs-o1", date: "2026-08-18", classesCount: 4, justified: false },
    ],
  },
  {
    id: "subj-osc",
    name: "Osc",
    color: "#FF5A5F",
    workloadHours: 60,
    slots: slots([[4, "14:00", "18:00"]]),
    absences: [
      { id: "abs-s1", date: "2026-08-13", classesCount: 4, justified: false },
      { id: "abs-s2", date: "2026-09-10", classesCount: 4, justified: false },
    ],
  },
];

export function seedData(): AppData {
  return {
    version: 1,
    settings: {
      minAttendance: 0.75,
      alertThreshold: 2,
      justifiedCounts: true,
    },
    activeSemesterId: "sem-2026-2",
    semesters: [
      {
        id: "sem-2026-2",
        name: "2026.2",
        startDate: "2026-08-03",
        endDate: "2026-11-15",
        archived: false,
        subjects: SUBJECTS,
        events: [],
      },
    ],
  };
}
