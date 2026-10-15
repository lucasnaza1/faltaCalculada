/** Verificação manual das regras de cálculo (casos de teste do guide, seção 9).
 * Rodar com: npx tsx scripts/verify-calc.ts (ou colar no Node após build). */

import { absenceLimit, subjectStats } from "../lib/calc";
import { seedData } from "../lib/seed";
import { eachDay, weekdayOf } from "../lib/dates";

const data = seedData();
const sem = data.semesters[0];
const TODAY = "2026-10-14";

let failures = 0;

function check(label: string, actual: number, expected: number) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${label}: obtido ${actual}, esperado ${expected}`,
  );
}

// 1. Tabela da faculdade
const TABLE: Array<[number, number]> = [
  [30, 7],
  [45, 11],
  [60, 15],
  [75, 18],
  [90, 22],
  [120, 30],
];
for (const [hours, expected] of TABLE) {
  const subj = { ...sem.subjects[0], workloadHours: hours, slots: [], absences: [] };
  check(`limite ${hours}h`, absenceLimit(subj, data.settings), expected);
}

// 2. Faltas restantes (dados reais, seção 2.2)
const EXPECTED: Record<string, number> = {
  Cirurgia: 14,
  Endo: 19,
  Perio: 13,
  Orto: 18,
  Osc: 7,
};
for (const s of sem.subjects) {
  const stats = subjectStats(s, sem, data.settings, TODAY);
  check(`restam ${s.name}`, stats.remaining, EXPECTED[s.name]);
}

// 3. Grade fecha com a carga horária, DESCONTANDO feriados nacionais que caem
// em dia de aula. No período 03/08–15/11/2026: 07/09 e 12/10 (seg → Endo −1h
// cada) e 02/11 (seg → Endo −1h). Logo Endo: 90 − 3 = 87 previsto.
const EXPECTED_PREDICTED: Record<string, number> = {
  Cirurgia: 90,
  Endo: 87,
  Perio: 60,
  Orto: 90,
  Osc: 60,
};
for (const s of sem.subjects) {
  const stats = subjectStats(s, sem, data.settings, TODAY);
  check(`previsto ${s.name}`, stats.predictedTotal, EXPECTED_PREDICTED[s.name]);
}

// 4. 07/09 (Independência) cai em segunda → Endo sem aula
const sep7 = eachDay("2026-09-07", "2026-09-07");
check("seg 07/09 é segunda", weekdayOf(sep7[0]), 1);

console.log(
  failures === 0
    ? "\n🎉 Todos os casos passaram."
    : `\n⚠️ ${failures} caso(s) falharam.`,
);
process.exit(failures === 0 ? 0 : 1);
