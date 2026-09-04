import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absensi Guru | SMK Ma'arif NU 01 Limpung",
    short_name: "Absensi Guru",
    description:
      "Sistem presensi kehadiran harian guru SMK Ma'arif NU 01 Limpung.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7E4",
    theme_color: "#00C853",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
