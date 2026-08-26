import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LMS PPLG | SMK Ma'arif NU 01 Limpung",
    short_name: "LMS PPLG",
    description:
      "Sistem pembelajaran digital untuk siswa, guru, dan admin jurusan Pengembangan Perangkat Lunak dan Gim SMK Ma'arif NU 01 Limpung.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1F5F8",
    theme_color: "#0082FB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
