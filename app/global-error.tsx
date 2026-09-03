"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ backgroundColor: "#0B0E14", color: "#EDF0F5" }}
        className="antialiased"
      >
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div
            style={{
              backgroundColor: "#121620",
              borderColor: "rgba(148,163,184,0.12)",
            }}
            className="w-full max-w-md rounded-lg border p-6 sm:p-8"
          >
            <h1 className="mb-2 text-lg font-semibold">
              Couldn&apos;t reach the FPL API
            </h1>
            <p style={{ color: "#A3ACBF" }} className="mb-6 break-words text-sm">
              {error.message || "Something went wrong while loading this page."}
            </p>
            <button
              onClick={() => reset()}
              style={{ backgroundColor: "#FFB020", color: "#1A1200" }}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
