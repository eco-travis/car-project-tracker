"use client";

/** Last-resort error page (replaces the root layout, so it can't use app styles). */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <main
          role="alert"
          style={{ textAlign: "center", padding: 24, maxWidth: 420 }}
        >
          <title>Something went wrong</title>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>
            The app hit an unexpected error. Your data is safe.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#777" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
