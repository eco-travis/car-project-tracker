"use client";

import { useEffect } from "react";

/** Flags <html data-hydrated> once React is interactive. E2E tests wait for it before typing. */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
