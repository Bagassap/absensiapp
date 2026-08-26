"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";

export function ImpersonationBanner({
  impersonatedBy, nama,
}: {
  impersonatedBy?: string | null; nama: string;
}) {
  const [loading, setLoading] = useState(false);

  if (!impersonatedBy) return null;

  async function handleStop() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users/stop-impersonate", { method: "POST" });
      const data = await res.json().catch(() => null);
      sessionStorage.setItem("lms_session", "1");
      window.location.href = data?.redirectTo || "/admin/dashboard";
    } catch {
      sessionStorage.setItem("lms_session", "1");
      window.location.href = "/admin/dashboard";
    }
  }

  return (
    <button
      onClick={handleStop}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold text-[#1C2B33] transition-opacity hover:opacity-90 disabled:opacity-70"
      style={{ background: "#C3F84A" }}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Eye size={14} />
      )}
      <span>
        Anda sedang memantau akun <strong>{nama}</strong> sebagai Administrator. Klik untuk kembali ke akun Anda.
      </span>
    </button>
  );
}
