"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Soal { id: string; judul: string; deskripsi?: string; fileUrl: string; fileName: string; }

export default function SoalPdfViewer({ soal, onClose }: { soal: Soal; onClose: () => void }) {
  const proxyUrl     = `/api/ujian-ukk/soal/file?path=${encodeURIComponent(soal.fileUrl)}`;
  const directUrl    = `http://localhost:3001${soal.fileUrl}`;
  const [blobUrl,    setBlobUrl]    = useState<string | null>(null);
  const [pdfError,   setPdfError]   = useState(false);
  const [numPages,   setNumPages]   = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth,  setPageWidth]  = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPdfError(false);
    setPageNumber(1);
    setNumPages(0);
    let cancelled = false;
    let createdUrl: string | null = null;
    fetch(proxyUrl, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => { if (cancelled) return; createdUrl = URL.createObjectURL(blob); setBlobUrl(createdUrl); })
      .catch(() => { if (!cancelled) setPdfError(true); });
    return () => { cancelled = true; if (createdUrl) URL.revokeObjectURL(createdUrl); };
  }, [proxyUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setPageWidth(Math.floor(e.contentRect.width) - 32));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div ref={containerRef} className="relative flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-800" style={{ minHeight: 340 }}>
        {pdfError ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center" style={{ minHeight: 340 }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F8]">
              <AlertCircle size={28} className="text-[#C3F84A]" />
            </div>
            <div>
              <p className="font-bold text-gray-700 dark:text-slate-200">PDF tidak dapat dimuat</p>
              <p className="mt-1 text-sm text-gray-500">Gunakan tombol Unduh untuk mengakses file</p>
            </div>
          </div>
        ) : !blobUrl ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 size={28} className="animate-spin text-[#C3F84A]" />
            <span className="text-sm text-gray-500 dark:text-slate-400">Memuat PDF…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPdfError(false); }}
              onLoadError={() => setPdfError(true)}
              loading={
                <div className="flex items-center justify-center gap-3 py-20">
                  <Loader2 size={28} className="animate-spin text-[#C3F84A]" />
                  <span className="text-sm text-gray-500">Memuat PDF…</span>
                </div>
              }>
              <Page pageNumber={pageNumber} width={pageWidth > 0 ? pageWidth : 640}
                renderAnnotationLayer={false} renderTextLayer={false}
                loading={<div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#C3F84A]" /></div>}
                className="shadow-xl" />
            </Document>
          </div>
        )}
      </div>

      {numPages > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-gray-100 bg-gray-50 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/60">
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:bg-gray-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">Halaman {pageNumber} / {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:bg-gray-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900">
        <p className="text-xs text-slate-400 truncate max-w-xs">{soal.fileName}</p>
        <motion.a href={directUrl} target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.04, boxShadow: "0 8px 24px rgba(195,248,74,0.4)" }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shrink-0"
          style={{ background: "#C3F84A", color: "#1C2B33" }}>
          <Download size={14} /> Unduh PDF
        </motion.a>
      </div>
    </>
  );
}
