/** Feriados nacionais (lista estática, fallback da BrasilAPI do guide seção 3.4). */

import { addDaysKey, toDateKey } from "./dates";

export interface Holiday {
  date: string;
  name: string;
}

/** Páscoa via algoritmo de Meeus/Jones/Butcher. */
function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toDateKey(new Date(year, month - 1, day));
}

const FIXED: Array<[number, number, string]> = [
  [1, 1, "Confraternização Universal"],
  [4, 21, "Tiradentes"],
  [5, 1, "Dia do Trabalho"],
  [9, 7, "Independência do Brasil"],
  [10, 12, "Nossa Senhora Aparecida"],
  [11, 2, "Finados"],
  [11, 15, "Proclamação da República"],
  [11, 20, "Consciência Negra"],
  [12, 25, "Natal"],
];

export function nationalHolidays(year: number): Holiday[] {
  const pascoa = easter(year);
  const fixed = FIXED.map(([m, d, name]) => ({
    date: toDateKey(new Date(year, m - 1, d)),
    name,
  }));
  return [
    ...fixed,
    { date: addDaysKey(pascoa, -47), name: "Carnaval" },
    { date: addDaysKey(pascoa, -2), name: "Sexta-feira Santa" },
    { date: addDaysKey(pascoa, 60), name: "Corpus Christi" },
  ].sort((x, y) => x.date.localeCompare(y.date));
}

export function holidaysByYears(years: Iterable<number>): Holiday[] {
  const out = new Map<string, Holiday>();
  for (const y of years) {
    for (const h of nationalHolidays(y)) out.set(h.date, h);
  }
  return [...out.values()].sort((a, b) => a.date.localeCompare(b.date));
}
