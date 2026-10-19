"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { KegiatanCard } from "@/components/absensi-harian/KegiatanCard";
import { todayJakarta } from "@/components/absensi-harian/shared";

export default function KelolaKegiatanPage() {
  const router = useRouter();
  const [tanggal] = useState(() => todayJakarta());
  const noop = useCallback(() => {}, []);

  return (
    <div className="relative isolate -m-4">
      <div className="relative flex items-center px-4 pb-3 pt-4">
        <button type="button" onClick={() => router.push("/admin/absensi-harian")}
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm active:bg-slate-100">
          <ChevronLeft size={18} />
        </button>
        <h1 className="absolute inset-x-0 text-center text-base font-bold text-slate-800 dark:text-white">Kelola Kegiatan</h1>
      </div>
      <div className="space-y-4 bg-transparent p-4 pb-8 dark:bg-slate-900">
        <KegiatanCard tanggal={tanggal} onChanged={noop} />
      </div>
    </div>
  );
}
