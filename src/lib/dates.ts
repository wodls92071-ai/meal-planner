export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 월요일을 주의 시작으로 본다
export function getWeekStart(d: Date): Date {
  const date = toDateOnly(d);
  const day = date.getDay(); // 0=일 ... 6=토
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function addDays(d: Date, days: number): Date {
  const date = toDateOnly(d);
  date.setDate(date.getDate() + days);
  return date;
}

// "YYYY-MM-DD" 형식만 다룸 — new Date(string)의 UTC 파싱으로 인한 하루 밀림을 피하기 위함
export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// 월요일 시작 6주(42칸) 그리드 — 앞뒤 달의 날짜로 채워짐
export function getMonthGridDates(monthStart: Date): Date[] {
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// "YYYY-MM" 형식만 다룸
export function parseMonthOnly(s: string): Date {
  const [y, m] = s.split("-").map(Number);
  return new Date(y, m - 1, 1);
}
