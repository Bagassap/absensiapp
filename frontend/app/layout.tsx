import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastSystem";
import { PwaInstall } from "@/components/shared/PwaInstall";
import { ConfirmProvider } from "@/components/shared/ConfirmSheet";

const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-VariableItalic.woff2",
      weight: "300 900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Absensi Guru | SMK Ma'arif NU 01 Limpung",
  description:
    "Sistem presensi kehadiran harian guru SMK Ma'arif NU 01 Limpung.",
  applicationName: "Absensi Guru",
  appleWebApp: { capable: true, title: "Absensi Guru", statusBarStyle: "default" },
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#013920",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${satoshi.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-black dark:bg-slate-900 dark:text-slate-100">
        <PwaInstall />
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
