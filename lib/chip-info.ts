/** Display info for an active chip as FPL names it in picks (`active_chip`). */
export function getChipInfo(chipName: string | null | undefined) {
  if (!chipName) return null;

  switch (chipName) {
    case "wildcard":
      return { abbr: "WC", color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Wildcard" };
    case "3xc":
      return { abbr: "TC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Triple Captain" };
    case "bboost":
      return { abbr: "BB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Bench Boost" };
    case "freehit":
      return { abbr: "FH", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Free Hit" };
    default:
      return null;
  }
}
