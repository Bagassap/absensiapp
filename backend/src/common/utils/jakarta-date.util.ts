
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

export function monthToDateRange(bulan: number, tahun: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  return { start: `${tahun}-${pad2(bulan)}-01`, end: `${tahun}-${pad2(bulan)}-${pad2(lastDay)}` };
}

export function addDaysUTC(dateStr: string, deltaDays: number): string {
  const d = parseIsoDateUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

const HARI_NAMES = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export function hariFor(dateStr: string): string {
  const dow = parseIsoDateUTC(dateStr).getUTCDay();
  return HARI_NAMES[dow];
}

export function mondayOf(dateStr: string): string {
  const dow = parseIsoDateUTC(dateStr).getUTCDay();
  return addDaysUTC(dateStr, -((dow + 6) % 7));
}

export function weekCycleIndex(anchorDateStr: string, dateStr: string, cycleLength: number): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = parseIsoDateUTC(mondayOf(dateStr)).getTime() - parseIsoDateUTC(mondayOf(anchorDateStr)).getTime();
  const weeks = Math.round(diff / msPerWeek);
  return ((weeks % cycleLength) + cycleLength) % cycleLength;
}
