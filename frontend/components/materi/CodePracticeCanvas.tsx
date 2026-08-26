"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Palette, FileCode, Play, RotateCcw, Maximize2, Minimize2, ShieldAlert } from "lucide-react";

type Tab = "html" | "css" | "js";

const TABS: { key: Tab; label: string; icon: typeof Code2 }[] = [
  { key: "html", label: "HTML", icon: Code2 },
  { key: "css", label: "CSS", icon: Palette },
  { key: "js", label: "JavaScript", icon: FileCode },
];

function buildSrcDoc(html: string, css: string, js: string) {
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; color: #1C2B33; margin: 0; padding: 12px; }
  ${css}
</style>
</head>
<body>
${html}
<script>
  window.addEventListener("error", function (e) {
    var pre = document.createElement("pre");
    pre.textContent = "Error: " + e.message;
    pre.style.cssText = "position:fixed;left:0;right:0;bottom:0;margin:0;padding:8px 12px;background:#FEE9EA;color:#EF4444;font:12px monospace;white-space:pre-wrap;border-top:1px solid #EF4444;";
    document.body.appendChild(pre);
  });
<\/script>
<script>
${safeJs}
<\/script>
</body>
</html>`;
}

export function CodePracticeCanvas({
  initialHtml = "", initialCss = "", initialJs = "", onChange, minHeight = 420, restrictPaste = false,
}: {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  onChange?: (code: { html: string; css: string; js: string }) => void;
  minHeight?: number;
  // Saat true: paste/cut/copy/drop teks ke editor diblokir — siswa harus
  // murni mengetik sendiri kodenya (anti-copas untuk mode Praktik Kode).
  restrictPaste?: boolean;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [tab, setTab] = useState<Tab>("html");
  const [srcDoc, setSrcDoc] = useState(() => buildSrcDoc(initialHtml, initialCss, initialJs));
  const [runKey, setRunKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [blockedHint, setBlockedHint] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashBlockedHint() {
    setBlockedHint(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setBlockedHint(false), 2200);
  }

  useEffect(() => () => { if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current); }, []);

  function blockClipboardEvent(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!restrictPaste) return;
    e.preventDefault();
    flashBlockedHint();
  }
  function blockDropEvent(e: React.DragEvent<HTMLTextAreaElement>) {
    if (!restrictPaste) return;
    e.preventDefault();
    flashBlockedHint();
  }
  function blockContextMenu(e: React.MouseEvent<HTMLTextAreaElement>) {
    if (!restrictPaste) return;
    e.preventDefault();
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSrcDoc(buildSrcDoc(html, css, js)), 400);
    onChange?.({ html, css, js });
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, css, js]);

  function runNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSrcDoc(buildSrcDoc(html, css, js));
    setRunKey((k) => k + 1);
  }

  function reset() {
    setHtml(initialHtml);
    setCss(initialCss);
    setJs(initialJs);
  }

  const value = tab === "html" ? html : tab === "css" ? css : js;
  const setValue = tab === "html" ? setHtml : tab === "css" ? setCss : setJs;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900" : "relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"}>
      <AnimatePresence>
        {blockedHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: "spring", damping: 22, stiffness: 340 }}
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center p-4"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-red-500 px-5 py-3.5 text-white shadow-2xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <ShieldAlert size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold leading-tight">Tempel/salin dinonaktifkan</p>
                <p className="text-xs font-medium text-white/85">Mode Praktik — ketik kodenya sendiri, ya!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-700/20">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${active ? "text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                style={active ? { background: "#0082FB" } : {}}>
                <t.icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {restrictPaste && (
            <span className="hidden items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 opacity-70 sm:flex dark:text-slate-600">
              <ShieldAlert size={11} /> Mode anti-copas
            </span>
          )}
          <button type="button" onClick={reset}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            <RotateCcw size={12} /> Reset
          </button>
          <button type="button" onClick={runNow}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:brightness-105"
            style={{ background: "#00D67F" }}>
            <Play size={12} /> Run
          </button>
          <button type="button" onClick={() => setFullscreen((f) => !f)}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1" style={fullscreen ? undefined : { minHeight }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={blockClipboardEvent}
          onCut={blockClipboardEvent}
          onCopy={blockClipboardEvent}
          onDrop={blockDropEvent}
          onDragOver={blockDropEvent}
          onContextMenu={blockContextMenu}
          spellCheck={false}
          placeholder={tab === "html" ? "<h1>Halo dunia!</h1>" : tab === "css" ? "h1 { color: #0082FB; }" : "console.log('halo');"}
          className="h-full w-full resize-none border-b border-slate-100 bg-slate-50/40 p-3.5 font-mono text-[13px] leading-relaxed text-slate-800 outline-none md:border-b-0 md:border-r dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
        />
        <iframe
          key={runKey}
          title="Hasil"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="h-full w-full bg-white"
        />
      </div>
    </div>
  );
}
