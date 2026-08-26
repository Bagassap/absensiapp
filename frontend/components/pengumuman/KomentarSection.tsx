"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CornerDownRight, Trash2, Send, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { Avatar } from "@/components/shared/Avatar";

export type KomentarItem = {
  id: string;
  konten: string;
  authorId: string;
  author: { id: string; nama: string; role: string; fotoProfil?: string | null };
  parentId: string | null;
  replies?: KomentarItem[];
  createdAt: string;
};

const ROLE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  ADMIN: { label: "Admin",  cls: "bg-[#EAF3FF] text-[#0064E0] dark:bg-[#0064E0]/40 dark:text-[#EAF3FF]", dot: "#0082FB" },
  GURU:  { label: "Guru",   cls: "bg-[#1C2B33]/10 text-[#1C2B33] dark:bg-[#1C2B33]/60 dark:text-[#F1F5F8]",  dot: "#0064E0" },
  SISWA: { label: "Siswa",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "#00D67F" },
};

// Pengumuman tidak memakai lime — merah menggantikan slot lime di sini juga.
const AVATAR_PALETTE = [
  "#0082FB",
  "#EF4444",
  "#0064E0",
  "#EF4444",
  "#0082FB",
  "#00D67F",
];
function avatarGradient(name: string) { return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]; }

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)  return "baru saja";
  if (diff < 3600) return `${Math.floor(diff/60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff/3600)} jam lalu`;
  return `${Math.floor(diff/86400)} hari lalu`;
}

function KomentarBubble({
  k,
  pengumumanId,
  currentUserId,
  canManage,
  isReply,
  onDelete,
  onReplyAdded,
}: {
  k: KomentarItem;
  pengumumanId: string;
  currentUserId: string;
  canManage: boolean;
  isReply?: boolean;
  onDelete: (id: string) => void;
  onReplyAdded: (reply: KomentarItem) => void;
}) {
  const toast = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText,     setReplyText]     = useState("");
  const [sending,       setSending]       = useState(false);
  const [showReplies,   setShowReplies]   = useState(true);

  const canDelete = canManage || k.authorId === currentUserId;
  const badge     = ROLE_BADGE[k.author.role] ?? ROLE_BADGE.SISWA;
  const avatarBg  = avatarGradient(k.author.nama);

  async function submitReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/pengumuman/${pengumumanId}/komentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konten: replyText, parentId: k.id }),
      });
      if (res.ok) {
        const reply: KomentarItem = await res.json();
        onReplyAdded(reply);
        setReplyText("");
        setShowReplyForm(false);
        toast.success("Balasan terkirim!");
      } else {
        toast.error("Gagal mengirim balasan");
      }
    } catch {
      toast.error("Koneksi bermasalah");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={isReply ? "" : "space-y-2"}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`group flex gap-3 ${isReply ? "mt-2" : ""}`}
      >
        <div className="relative shrink-0">
          <Avatar
            src={k.author.fotoProfil}
            nama={k.author.nama}
            sizePx={36}
            fallbackBg={avatarBg}
            textClassName="text-xs font-extrabold"
            className="shadow-md ring-2 ring-white dark:ring-[#1C2B33]"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-[1.5px] ring-white dark:ring-[#1C2B33]"
            style={{ backgroundColor: badge.dot }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative overflow-hidden rounded-2xl rounded-tl-sm border border-slate-100 bg-white shadow-sm dark:border-slate-700/40 dark:bg-slate-800/60">
            <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: avatarBg }} />

            <div className="px-4 py-3 pt-3.5">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-bold text-slate-900 dark:text-white">{k.author.nama}</span>
                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(k.createdAt)}</span>
              </div>

              <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200" style={{ whiteSpace: "pre-wrap" }}>
                {k.konten}
              </p>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-50 px-4 py-2 dark:border-slate-700/30">
              {!isReply && (
                <button
                  onClick={() => setShowReplyForm((v) => !v)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 transition-all hover:bg-blue-50 hover:text-[#0064E0] dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  <CornerDownRight size={11} /> Balas
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(k.id)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <Trash2 size={10} /> Hapus
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showReplyForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="flex items-end gap-2 rounded-xl border border-[#0064E0]/25 bg-[#EAF3FF] p-3 dark:border-blue-700/30 dark:bg-[#1C2B33]">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Balas ${k.author.nama}…`}
                    className="flex-1 resize-none rounded-lg bg-white/80 px-3 py-2 text-[12.5px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder:text-slate-500"
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitReply(); }}
                  />
                  <button
                    onClick={submitReply}
                    disabled={sending || !replyText.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-all disabled:opacity-40 hover:shadow-[0_4px_12px_rgba(0,100,224,0.4)]"
                    style={{ background: "#0064E0" }}
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {!isReply && k.replies && k.replies.length > 0 && (
        <div className="ml-12">
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-[#0064E0]/70 transition-all hover:bg-blue-50 hover:text-[#0064E0] dark:hover:bg-blue-900/20"
          >
            <ChevronDown size={12} className={`transition-transform duration-200 ${showReplies ? "rotate-180" : ""}`} />
            {k.replies.length} balasan
          </button>
          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2 border-l-2 border-[#0064E0]/15 pl-3 dark:border-blue-700/25"
              >
                {k.replies.map((r) => (
                  <KomentarBubble
                    key={r.id}
                    k={r}
                    pengumumanId={pengumumanId}
                    currentUserId={currentUserId}
                    canManage={canManage}
                    isReply
                    onDelete={onDelete}
                    onReplyAdded={() => {}}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function KomentarSection({
  initialKomentar,
  pengumumanId,
  currentUserId,
  canManage,
}: {
  initialKomentar: KomentarItem[];
  pengumumanId: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const toast = useToast();
  const [komentar, setKomentar] = useState<KomentarItem[]>(initialKomentar);
  const [teks,     setTeks]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [focused,  setFocused]  = useState(false);
  const [showAll,  setShowAll]  = useState(false);

  async function submitKomentar() {
    if (!teks.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/pengumuman/${pengumumanId}/komentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konten: teks }),
      });
      if (res.ok) {
        const newK: KomentarItem = await res.json();
        setKomentar((prev) => [...prev, { ...newK, replies: [] }]);
        setTeks("");
        toast.success("Komentar terkirim!");
      } else {
        toast.error("Gagal mengirim komentar", "Coba lagi beberapa saat.");
      }
    } catch {
      toast.error("Koneksi bermasalah", "Periksa koneksi internet kamu.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!await toast.confirm("Hapus komentar ini?")) return;
    const res = await fetch(`/api/pengumuman/komentar/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKomentar((prev) =>
        prev
          .filter((k) => k.id !== id)
          .map((k) => ({ ...k, replies: (k.replies ?? []).filter((r) => r.id !== id) })),
      );
      toast.info("Komentar dihapus.");
    } else {
      toast.error("Gagal menghapus komentar");
    }
  }

  function handleReplyAdded(parentId: string, reply: KomentarItem) {
    setKomentar((prev) =>
      prev.map((k) =>
        k.id === parentId
          ? { ...k, replies: [...(k.replies ?? []), reply] }
          : k,
      ),
    );
  }

  const PREVIEW_COUNT = 3;
  // Show the 3 most recent top-level comments by default (komentar arrives
  // oldest-first from the backend, and new ones are appended to the end) —
  // full thread, oldest-first, only after "Lihat Semua Komentar" is clicked.
  const hasMore = komentar.length > PREVIEW_COUNT;
  const visibleKomentar = showAll || !hasMore ? komentar : komentar.slice(-PREVIEW_COUNT);

  return (
    <div className="space-y-5">

      <div className={`relative overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 dark:bg-slate-800/50 ${
        focused
          ? "border-[#0064E0]/40 shadow-[0_0_0_4px_rgba(0,100,224,0.08)]"
          : "border-slate-100 shadow-sm dark:border-slate-700/50"
      }`}>
        <div className={`absolute left-0 right-0 top-0 h-0.5 transition-opacity duration-200 ${focused ? "opacity-100" : "opacity-0"}`}
          style={{ background: "#0064E0" }} />

        <textarea
          rows={3}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Tulis komentar atau pertanyaan kamu di sini…"
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitKomentar(); }}
        />

        <div className="flex items-center justify-between border-t border-slate-50 px-4 py-2.5 dark:border-slate-700/30">
          <span className="text-[10px] text-slate-300 dark:text-slate-600">
            Ctrl+Enter untuk kirim
          </span>
          <button
            onClick={submitKomentar}
            disabled={sending || !teks.trim()}
            className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-[12px] font-bold text-white shadow-md transition-all disabled:opacity-40 hover:shadow-[0_4px_14px_rgba(0,100,224,0.45)] active:scale-95"
            style={{ background: "#0064E0" }}
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {sending ? "Mengirim…" : "Kirim"}
          </button>
        </div>
      </div>

      {komentar.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50 py-10 text-center dark:border-slate-700/40 dark:bg-[#1C2B33]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0082FB]/10">
            <Sparkles size={20} className="text-[#0064E0] dark:text-blue-400" />
          </div>
          <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">Belum ada komentar</p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Jadilah yang pertama berkomentar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleKomentar.map((k) => (
            <KomentarBubble
              key={k.id}
              k={k}
              pengumumanId={pengumumanId}
              currentUserId={currentUserId}
              canManage={canManage}
              onDelete={handleDelete}
              onReplyAdded={(reply) => handleReplyAdded(k.id, reply)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-[12px] font-bold transition-all ${
                showAll
                  ? "border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/40"
                  : "border-slate-200 text-[#0064E0] hover:bg-blue-50 dark:border-slate-700/50 dark:hover:bg-blue-900/20"
              }`}
            >
              <ChevronDown size={13} className={showAll ? "rotate-180" : ""} />
              {showAll ? "Sembunyikan" : `Lihat Semua Komentar (${komentar.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
