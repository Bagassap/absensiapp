const BAR_HEIGHTS = [45, 75, 58, 92, 68, 82];

// Small decorative bar-sparkline used on stat cards, purely visual (no real
// data behind it) — echoes the little chart glyphs on each stat card in the
// reference design.
export function MiniBarChart({ color = "#FFFFFF", size = 40 }: { color?: string; size?: number }) {
  return (
    <div className="flex shrink-0 items-end gap-1" style={{ height: size }}>
      {BAR_HEIGHTS.map((h, i) => (
        <span key={i} className="w-2 rounded-full" style={{ height: `${h}%`, backgroundColor: color }} />
      ))}
    </div>
  );
}
