"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-lg shadow-lg p-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <h1 className="text-lg font-semibold text-white mb-2">Couldn&apos;t reach the FPL API</h1>
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
  );
}
