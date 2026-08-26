// The server process runs in UTC (not WIB). `new Date().toISOString()` and
// plain Date getters (getDay/getDate/...) all read the process's system
// timezone, so anything built from them silently reports yesterday's date
// during the ~7h/day window where WIB has already crossed into a new day
// but UTC hasn't (UTC 17:00-23:59 = WIB 00:00-06:59). Every "what is today"
// computation in the backend must go through these helpers instead.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function jakartaParts(at: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const WEEKDAY_NUM: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    dayOfWeek: WEEKDAY_NUM[get('weekday')] ?? 0,
  };
}

export function todayJakarta(): string {
  return jakartaParts().date;
}

// Monday-Friday of the current Jakarta week, as yyyy-mm-dd strings. Anchors
// on a UTC-midnight Date built from the already-resolved Jakarta calendar
// date, so the day-of-week/date arithmetic below can't be skewed by the
// host's own timezone again.
export function weekDatesJakarta(): string[] {
  const { year, month, day, dayOfWeek } = jakartaParts();
  const anchor = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  anchor.setUTCDate(anchor.getUTCDate() + mondayOffset);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() + i);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  });
}

function parseIsoDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// "Hari efektif" for a recap = school weekdays only (Senin-Jumat) — Sabtu-Minggu
// never has an absen window at all (see currentWindow() in
// absensi-harian.service.ts), so they're excluded even if the raw range
// happens to span a weekend. Inclusive of both start and end.
export function effectiveWeekdaysInRange(startStr: string, endStr: string): string[] {
  const start = parseIsoDateUTC(startStr);
  const end = parseIsoDateUTC(endStr);
  const days: string[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      days.push(`${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`);
    }
  }
  return days;
}

// First/last calendar day of a given month (1-12), as yyyy-mm-dd strings.
export function monthToDateRange(bulan: number, tahun: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  return { start: `${tahun}-${pad2(bulan)}-01`, end: `${tahun}-${pad2(bulan)}-${pad2(lastDay)}` };
}

// `dateStr` shifted by `deltaDays` (negative to go back), as a yyyy-mm-dd
// string. UTC-anchored like the helpers above so it can't be skewed by the
// host's own timezone.
export function addDaysUTC(dateStr: string, deltaDays: number): string {
  const d = parseIsoDateUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
