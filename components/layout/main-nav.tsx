"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home, Swords, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** True when `pathname` is exactly `prefix`, or nested under it (`prefix/...`). */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      active: matchesPrefix(pathname, "/dashboard"),
    },
    {
      href: "/",
      label: "League",
      icon: Trophy,
      active: pathname === "/" || matchesPrefix(pathname, "/team"),
    },
    {
      href: "/gameweek",
      label: "Gameweek",
      icon: Zap,
      active: matchesPrefix(pathname, "/gameweek"),
    },
    {
      href: "/h2h",
      label: "H2H",
      icon: Swords,
      active: matchesPrefix(pathname, "/h2h"),
    },
    {
      href: "/transfers",
      label: "Transfers",
      icon: ArrowRightLeft,
      active: matchesPrefix(pathname, "/transfers"),
    },
    {
      href: "/stats",
      label: "Stats",
      icon: BarChart,
      active: matchesPrefix(pathname, "/stats"),
    },
  ];

  return (
    <nav className="hidden w-full items-center gap-6 md:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-sm text-base font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Qitawrari
      </Link>
      <div className="flex items-center gap-1">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              route.active
                ? "text-fg after:bg-accent"
                : "text-fg-2 after:bg-transparent hover:text-fg"
            )}
          >
            <route.icon className="h-4 w-4" />
            {route.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
