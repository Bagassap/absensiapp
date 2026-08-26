"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import type { UserPayload } from "@/lib/auth";

export function DashboardShell({
  user,
  children,
}: {
  user: UserPayload;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("lms_session")) {
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        window.location.replace("/login");
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={user}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={[
          "flex min-w-0 flex-1 flex-col bg-surface transition-[padding] duration-300 ease-in-out dark:bg-[#1C2B33]",
          sidebarCollapsed ? "lg:pl-18" : "lg:pl-64",
        ].join(" ")}
      >
        <ImpersonationBanner impersonatedBy={user.impersonatedBy} nama={user.nama} />
        <Topbar user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">{children}</main>
      </div>
    </div>
  );
}
