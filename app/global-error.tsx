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
      <body className="bg-[#131928] text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8">
            <h1 className="text-lg font-semibold mb-2">Couldn&apos;t reach the FPL API</h1>
            <p className="text-sm text-white/60 mb-6 break-words">
              {error.message || "Something went wrong while loading this page."}
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors px-4 py-2 text-sm font-medium text-white active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
