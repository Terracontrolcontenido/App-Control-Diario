/**
 * Utility functions for local date management.
 * Avoids UTC timezone conversion shifts caused by `new Date().toISOString()`,
 * which in evening hours (e.g. UTC-4 in Bolivia after 20:00) causes the date
 * to jump to tomorrow's date prematurely.
 */

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return formatDateToYYYYMMDD(date);
  } catch {
    return dateStr;
  }
}

export function formatSpanishDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
    const monthName = d.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday}, ${day} de ${monthName} de ${year}`;
  } catch {
    return dateStr;
  }
}
