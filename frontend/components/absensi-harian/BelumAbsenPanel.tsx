"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Search, Copy, Check, X, Clock, Info, MinusCircle, AlertCircle, Users } from "lucide-react";
import { avatarColorFor } from "@/components/data-siswa/shared";
import { PULANG_CFG, DASHBOARD_GRADIENTS, DASHBOARD_ACCENT, DASHBOARD_PASTEL } from "./shared";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/ToastSystem";
import type { SiswaAbsensi } from "./types";

// waktuAbsen is stored as an already-formatted "HH.mm" clock string (set via
// toLocaleTimeString at check-in time, see app/siswa/absensi-harian/page.tsx),
// not an ISO datetime — re-parsing it with `new Date()` produces Invalid Date.
function formatJam(waktu?: string | null) {
  return waktu && waktu.trim() ? waktu : "-";
}

// Small white stat-card trigger, matching the reference's "Trading Fees"
// cards: gradient circular icon badge on the left, big count + small label
// on the right. Still clickable (opens the same DetailModal as before) —
// only the visual shell changed, not the underlying interaction.
function StatTrigger({
  title, icon: Icon, gradient, accent, items, total, hint, onOpen,
}: {
  title: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  items: SiswaAbsensi[];
  total: number;
  hint: string;
  onOpen: () => void;
}) {
  const pct = total > 0 ? Math.round((items.length / total) * 100) : 0;
  return (
    <motion.button type="button" onClick={onOpen}
      whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800 dark:shadow-none">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: gradient }}>
        <Icon size={17} className="text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl font-extrabold tabular-nums text-slate-800 dark:text-white">{items.length}</p>
          <span className="text-[10px] font-bold" style={{ color: accent }}>{pct}%</span>
        </div>
        <p className="truncate text-[11px] font-semibold text-slate-400 dark:text-slate-500">{title}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
          dari {total} siswa hari ini
        </p>
        <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: gradient }} />
        </div>
        <p className="mt-1.5 truncate text-[10px] font-semibold" style={{ color: accent }}>{hint}</p>
      </div>
    </motion.button>
  );
}

function DetailModal({
  title, icon: Icon, headerBg, iconColor, emptyMessage, items, mode, onClose,
}: {
  title: string;
  icon: React.ElementType;
  headerBg: string;
  iconColor: string;
  emptyMessage: string;
  items: SiswaAbsensi[];
  mode: "hadir" | "pulang";
  onClose: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.nama.toLowerCase().includes(q) || (s.nis ?? "").toLowerCase().includes(q));
  }, [items, query]);

  async function copyNames() {
    const text = items.map((s, i) => `${i + 1}. ${s.nama}${s.nis ? ` (${s.nis})` : ""}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Daftar disalin", `${items.length} nama siap ditempel ke pesan pengingat`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin", "Coba lagi atau salin manual");
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-4" style={{ backgroundColor: headerBg }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <Icon size={17} style={{ color: iconColor }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold" style={{ color: iconColor }}>{title}</p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Users size={10} /> {items.length} siswa dalam daftar ini
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-100">
            <X size={15} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <PartyPopper size={24} style={{ color: iconColor }} />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-start gap-1.5 border-b border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/40">
              <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-[10px] font-medium leading-snug text-slate-400 dark:text-slate-500">
                Klik <span className="font-bold" style={{ color: iconColor }}>Salin</span> untuk menyalin daftar nama, lalu tempel ke grup WhatsApp sebagai pesan pengingat.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <div className="relative flex-1">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / NIS..." autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  style={{ "--tw-ring-color": iconColor } as React.CSSProperties} />
              </div>
              <button type="button" onClick={copyNames}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                style={{ backgroundColor: iconColor }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Disalin" : "Salin"}
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">Tidak ada yang cocok dengan &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="thin-scrollbar flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                {filtered.map((s) => (
                  <div key={s.siswaId} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Avatar
                      src={s.fotoProfil}
                      nama={s.nama}
                      sizePx={34}
                      fallbackBg={avatarColorFor(s.nama)}
                      textClassName="text-[10px] font-extrabold"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{s.nama}</p>
                      {mode === "pulang" ? (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          <Clock size={10} className="shrink-0" /> Hadir pukul {formatJam(s.waktuAbsen)}
                        </p>
                      ) : s.status === "ALPA" ? (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium text-red-400">
                          <MinusCircle size={10} className="shrink-0" /> Ditandai alpa
                        </p>
                      ) : (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          <AlertCircle size={10} className="shrink-0" /> Belum ada catatan absen
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: headerBg, color: iconColor }}>
                      {s.nis ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

export function BelumAbsenPanel({ siswaList }: { siswaList: SiswaAbsensi[] }) {
  const [activeModal, setActiveModal] = useState<"hadir" | "pulang" | null>(null);

  const belumHadir = siswaList.filter((s) => !s.status || s.status === "ALPA");
  const belumPulang = siswaList.filter((s) => !s.waktuPulang);
  const hadirIdx = 3; // biru terang
  const pulangIdx = 2; // red — indeks 1 (lime) dihindari karena badge ikonnya teks putih tetap

  return (
    <>
      <div className="flex h-full flex-col justify-center gap-3">
        <StatTrigger
          title="Belum Absen Hadir"
          icon={Clock}
          gradient={DASHBOARD_GRADIENTS[hadirIdx]}
          accent={DASHBOARD_ACCENT[hadirIdx]}
          items={belumHadir}
          total={siswaList.length}
          hint="Perlu tindak lanjut segera →"
          onOpen={() => setActiveModal("hadir")}
        />
        <StatTrigger
          title="Belum Absen Pulang"
          icon={PULANG_CFG.icon}
          gradient={DASHBOARD_GRADIENTS[pulangIdx]}
          accent={DASHBOARD_ACCENT[pulangIdx]}
          items={belumPulang}
          total={siswaList.length}
          hint="Klik untuk kirim pengingat →"
          onOpen={() => setActiveModal("pulang")}
        />
      </div>

      <AnimatePresence>
        {activeModal === "hadir" && (
          <DetailModal
            title="Siswa Belum Absen Hadir"
            icon={Clock}
            headerBg={DASHBOARD_PASTEL[hadirIdx]}
            iconColor={DASHBOARD_ACCENT[hadirIdx]}
            emptyMessage="Semua siswa sudah absen hadir!"
            items={belumHadir}
            mode="hadir"
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "pulang" && (
          <DetailModal
            title="Siswa Belum Absen Pulang"
            icon={PULANG_CFG.icon}
            headerBg={DASHBOARD_PASTEL[pulangIdx]}
            iconColor={DASHBOARD_ACCENT[pulangIdx]}
            emptyMessage="Semua siswa sudah absen pulang!"
            items={belumPulang}
            mode="pulang"
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
