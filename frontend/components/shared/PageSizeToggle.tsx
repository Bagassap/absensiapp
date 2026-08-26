"use client";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, Infinity] as const;

function labelFor(size: number) {
  return Number.isFinite(size) ? String(size) : "Semua";
}

export function PageSizeToggle({ value, onChange }: {
  value: number;
  onChange: (size: number) => void;
}) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600">
      {PAGE_SIZE_OPTIONS.map((size, i) => {
        const active = value === size;
        return (
          <button key={size} type="button" onClick={() => onChange(size)}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${i > 0 ? "border-l border-slate-200 dark:border-slate-600" : ""} ${
              active
                ? "bg-[#0082FB] text-white"
                : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}>
            {labelFor(size)}
          </button>
        );
      })}
    </div>
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  if (!Number.isFinite(pageSize)) {
    return { pageItems: items, pageCount: 1, start: items.length ? 1 : 0, end: items.length };
  }
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize);
  const start = items.length ? page * pageSize + 1 : 0;
  const end = Math.min((page + 1) * pageSize, items.length);
  return { pageItems, pageCount, start, end };
}
