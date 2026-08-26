"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { downloadDataSiswaPdf, downloadDataSiswaExcel } from "./downloadDataSiswa";

type ExportKind = "pdf" | "excel";

export function DataSiswaExportButtons({ kelasId, kelasNama, jurusan }: { kelasId?: string; kelasNama?: string; jurusan?: string }) {
  const toast = useToast();
  const [loadingKind, setLoadingKind] = useState<ExportKind | null>(null);

  async function run(kind: ExportKind) {
    if (loadingKind) return;
    setLoadingKind(kind);
    try {
      const result =
        kind === "pdf"
          ? await downloadDataSiswaPdf({ kelasId, kelasNama, jurusan })
          : await downloadDataSiswaExcel({ kelasId, kelasNama, jurusan });
      if (!result.ok) toast.error(kind === "pdf" ? "Gagal membuat PDF" : "Gagal membuat Excel", result.message);
    } finally {
      setLoadingKind(null);
    }
  }

  const PDF_STYLE = { backgroundColor: "#FEE9EA", color: "#EF4444", borderColor: "#EF444430" };
  const EXCEL_STYLE = { backgroundColor: "#E3FBF0", color: "#00D67F", borderColor: "#00D67F30" };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => run("pdf")} disabled={!!loadingKind}
        className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={PDF_STYLE}>
        {loadingKind === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        Download PDF
      </button>
      <button type="button" onClick={() => run("excel")} disabled={!!loadingKind}
        className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={EXCEL_STYLE}>
        {loadingKind === "excel" ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
        Download Excel
      </button>
    </div>
  );
}
