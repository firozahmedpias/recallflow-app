/**
 * Local calendar date utilities (YYYY-MM-DD).
 * Avoids UTC off-by-one shifts caused by Date.toISOString().
 */

export function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return formatLocalDateISO(new Date());
}

export function parseLocalDateISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseLocalDateISO(iso);
  date.setDate(date.getDate() + days);
  return formatLocalDateISO(date);
}

export function diffDaysISO(fromISO: string, toISO: string): number {
  const a = parseLocalDateISO(fromISO);
  const b = parseLocalDateISO(toISO);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export function formatDisplayDate(iso: string): string {
  const today = getTodayISO();
  if (iso === today) return 'Today';
  if (iso === addDaysISO(today, -1)) return 'Yesterday';
  if (iso === addDaysISO(today, 1)) return 'Tomorrow';

  const date = parseLocalDateISO(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatHeaderDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function getLastNDaysISO(count: number, endISO = getTodayISO()): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(addDaysISO(endISO, -i));
  }
  return days;
}

export function getWeekStartISO(iso: string): string {
  const date = parseLocalDateISO(iso);
  const day = date.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return formatLocalDateISO(date);
}
