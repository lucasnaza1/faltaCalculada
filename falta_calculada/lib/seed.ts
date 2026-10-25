/** Seed inicial — documento vazio para novos usuários.
 *
 * O app começa sem matérias: o usuário cadastra as dele em /materias.
 * Dados de demonstração não são mais embarcados.
 */

import type { AppData } from "./types";

export function seedData(): AppData {
  const now = new Date();
  const year = now.getFullYear();
  // semestre corrente por data (1º semestre até junho)
  const suffix = now.getMonth() + 1 <= 6 ? "1" : "2";
  const startMonth = suffix === "1" ? "02" : "08";
  const endMonth = suffix === "1" ? "06" : "12";

  return {
    version: 1,
    settings: {
      minAttendance: 0.75,
      alertThreshold: 2,
      justifiedCounts: true,
    },
    activeSemesterId: `sem-${year}-${suffix}`,
    semesters: [
      {
        id: `sem-${year}-${suffix}`,
        name: `${year}.${suffix}`,
        startDate: `${year}-${startMonth}-01`,
        endDate: `${year}-${endMonth}-28`,
        archived: false,
        subjects: [],
        events: [],
      },
    ],
  };
}
