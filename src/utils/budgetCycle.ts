export interface BudgetCycle {
  cycleStart: string;      // ISO date: début du cycle actuel
  cycleEnd: string;        // ISO date: fin du cycle actuel (veille du prochain payday)
  prevCycleStart: string;  // ISO date: début du cycle précédent
  prevCycleEnd: string;    // ISO date: fin du cycle précédent
  daysElapsed: number;     // jours écoulés depuis cycleStart (inclusif)
  daysInCycle: number;     // durée totale du cycle en jours
  cycleLabel: string;      // ex: "27 juin – 26 juil. 2026"
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Calcule le cycle budgétaire aligné sur le jour de paie.
 * payday=27, today=11 juil. → cycle = 27 juin – 26 juil.
 * payday=1  (ou freelance) → équivalent au mois calendaire.
 */
export function getBudgetCycle(payday: number, now = new Date()): BudgetCycle {
  const day = now.getDate();
  let startYear = now.getFullYear();
  let startMonth = now.getMonth(); // 0-indexed

  if (day < payday) {
    // Avant le payday de ce mois → le cycle a démarré le mois dernier
    startMonth -= 1;
    if (startMonth < 0) { startMonth = 11; startYear -= 1; }
  }

  const lastDayStart = new Date(startYear, startMonth + 1, 0).getDate();
  const clampedPayday = Math.min(payday, lastDayStart);
  const cycleStartDate = new Date(startYear, startMonth, clampedPayday);

  // Fin du cycle : veille du prochain payday
  let nextYear = startYear, nextMonth = startMonth + 1;
  if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
  const lastDayNext = new Date(nextYear, nextMonth + 1, 0).getDate();
  const nextPaydayDate = new Date(nextYear, nextMonth, Math.min(payday, lastDayNext));
  const cycleEndDate = new Date(nextPaydayDate.getTime() - 86400000);

  // Cycle précédent
  let prevYear = startYear, prevMonth = startMonth - 1;
  if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
  const lastDayPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevCycleStartDate = new Date(prevYear, prevMonth, Math.min(payday, lastDayPrev));
  const prevCycleEndDate = new Date(cycleStartDate.getTime() - 86400000);

  const MS = 86400000;
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - cycleStartDate.getTime()) / MS) + 1);
  const daysInCycle = Math.floor((cycleEndDate.getTime() - cycleStartDate.getTime()) / MS) + 1;

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const cycleLabel = `${fmt(cycleStartDate)} – ${fmt(cycleEndDate)} ${cycleEndDate.getFullYear()}`;

  return {
    cycleStart: toISO(cycleStartDate),
    cycleEnd: toISO(cycleEndDate),
    prevCycleStart: toISO(prevCycleStartDate),
    prevCycleEnd: toISO(prevCycleEndDate),
    daysElapsed,
    daysInCycle,
    cycleLabel,
  };
}
