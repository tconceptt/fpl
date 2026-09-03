import Link from "next/link";

/**
 * A full-row link overlay for a `<TableRow className="relative">`: placed in
 * any cell of that row, it absolutely positions against the row itself (the
 * nearest *positioned* ancestor — the cell stays static) so the whole row is
 * one accessible link rather than a nested anchor/button per cell. Any
 * interactive element that must stay clickable above it (an expand button,
 * a chip badge) needs `relative z-10`.
 */
export function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    />
  );
}
