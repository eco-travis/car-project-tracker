import type { MetadataRoute } from "next";

/** Installable (home screen, standalone window). No service worker: offline is post-MVP. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cayenne Project Tracker",
    short_name: "Cayenne",
    description: "Plan, track, and document the Cayenne build.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
