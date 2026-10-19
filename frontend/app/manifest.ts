import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Absensi Guru | SMK Ma'arif NU 01 Limpung",
    short_name: "Absensi Guru",
    description: "Sistem presensi kehadiran harian guru SMK Ma'arif NU 01 Limpung.",
    lang: "id",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F7FB",
    theme_color: "#013920",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
