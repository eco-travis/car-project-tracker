"use client";

import { useEffect } from "react";

/**
 * Flags <html data-page-ready> once the screen's own content has hydrated. Screens render inside
 * the shell's loading (Suspense) boundary, so the root-level hydration flag can be set before the
 * screen is interactive. E2E waits for this on app screens before typing.
 */
export function PageReady() {
  useEffect(() => {
    document.documentElement.dataset.pageReady = "true";
    return () => {
      delete document.documentElement.dataset.pageReady;
    };
  }, []);
  return null;
}
