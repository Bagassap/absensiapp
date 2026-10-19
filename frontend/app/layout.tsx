import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastSystem";
import { PwaInstall } from "@/components/shared/PwaInstall";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${satoshi.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-black">
        <PwaInstall />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
