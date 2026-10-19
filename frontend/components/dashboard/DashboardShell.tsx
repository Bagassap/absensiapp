"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTitle, isMobileSubPage } from "./MobileTitle";
import type { UserPayload } from "@/lib/auth";

export function DashboardShell({
  user,
  children,
}: {
  user: UserPayload;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const subPage = isMobileSubPage(pathname);

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
        open={false}
        collapsed={sidebarCollapsed}
        onClose={() => {}}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div
        className={[
          "flex min-w-0 flex-1 flex-col bg-[#F5F7FB] transition-[padding] duration-300 ease-in-out dark:bg-slate-900 lg:bg-surface",
          sidebarCollapsed ? "lg:pl-18" : "lg:pl-64",
        ].join(" ")}
      >
        <ImpersonationBanner impersonatedBy={user.impersonatedBy} nama={user.nama} />
        <Topbar user={user} mobileHidden={subPage} />
        <MobileTitle user={user} />
        <main className="mx-auto w-full max-w-screen-2xl p-4 pb-28 md:p-6 lg:pb-6 2xl:p-10">{children}</main>
      </div>

      <MobileBottomNav user={user} />
    </div>
  );
}
