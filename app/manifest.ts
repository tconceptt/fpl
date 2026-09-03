import type { MetadataRoute } from "next";
import { leagueConfig } from "@/config/league";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: leagueConfig.appTitle,
    short_name: "Qitawrari FPL",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E14",
    theme_color: "#0B0E14",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
