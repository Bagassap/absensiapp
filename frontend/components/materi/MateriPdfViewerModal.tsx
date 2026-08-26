"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, AlertCircle, Loader2, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import type { MateriItem } from "./MateriFormModal";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function isPdf(fileUrl: string | null, fileName: string | null) {
  return (fileName ?? fileUrl ?? "").toLowerCase().endsWith(".pdf");
}

export function MateriPdfViewerModal({ materi, onClose }: { materi: MateriItem | null; onClose: () => void }) {
  const fileUrl = materi?.fileUrl ?? null;
  const proxyUrl = fileUrl ? `/api${fileUrl}` : null;
  const pdf = fileUrl ? isPdf(fileUrl, materi?.fileName ?? null) : false;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPdfError(false); setPageNumber(1); setNumPages(0);
    if (!proxyUrl || !pdf) return;
    let cancelled = false; let createdUrl: string | null = null;
    fetch(proxyUrl, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => { if (cancelled) return; createdUrl = URL.createObjectURL(blob); setBlobUrl(createdUrl); })
      .catch(() => { if (!cancelled) setPdfError(true); });
    return () => { cancelled = true; if (createdUrl) URL.revokeObjectURL(createdUrl); };
  }, [proxyUrl, pdf]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setPageWidth(Math.floor(e.contentRect.width) - 32));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {materi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="relative flex h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">

            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-4"
              style={{ background: "#0082FB" }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <BookOpen size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold text-white">{materi.judul}</h2>
                <p className="text-xs text-white/70">{materi.mapel}</p>
              </div>
              <button onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
                <X size={16} />
              </button>
            </div>

            {!fileUrl ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F8]">
                  <AlertCircle size={28} className="text-[#C3F84A]" />
                </div>
                <p className="font-bold text-gray-700 dark:text-slate-200">Materi ini belum punya file</p>
              </div>
            ) : !pdf ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                  <FileText size={28} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-700 dark:text-slate-200">{materi.fileName ?? "File modul"}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">File ini bukan PDF, jadi tidak bisa ditampilkan di sini</p>
                </div>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md"
                  style={{ background: "#0082FB" }}>
                  <Download size={14} /> Unduh File
                </a>
              </div>
            ) : (
              <>
                <div ref={containerRef} className="relative flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-900">
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
                      <Loader2 size={28} className="animate-spin text-blue-500" />
                      <span className="text-sm text-gray-500 dark:text-slate-400">Memuat PDF…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <Document file={blobUrl}
                        onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPdfError(false); }}
                        onLoadError={() => setPdfError(true)}
                        loading={<div className="flex items-center justify-center gap-3 py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>}>
                        <Page pageNumber={pageNumber} width={pageWidth > 0 ? pageWidth : 640}
                          renderAnnotationLayer={false} renderTextLayer={false}
                          loading={<div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-blue-500" /></div>}
                          className="shadow-xl" />
                      </Document>
                    </div>
                  )}
                </div>
                {numPages > 1 && (
                  <div className="flex shrink-0 items-center justify-center gap-3 border-t border-gray-100 bg-gray-50 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/60">
                    <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:bg-gray-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">Halaman {pageNumber} / {numPages}</span>
                    <button onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm hover:bg-gray-100 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900">
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{materi.fileName}</p>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shrink-0"
                    style={{ background: "#0082FB" }}>
                    <Download size={14} /> Unduh PDF
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
