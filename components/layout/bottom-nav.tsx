"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

/** True when `pathname` is exactly `prefix`, or nested under it (`prefix/...`). */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const SCROLL_THRESHOLD = 8;

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (currentScrollY <= 5) {
        setIsVisible(true);
      } else if (Math.abs(delta) > SCROLL_THRESHOLD) {
        setIsVisible(delta < 0);
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // /team/... belongs to the league tab — team pages are reached from the
  // league table and have no nav entry of their own.
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
      href: "/stats",
      label: "Stats",
      icon: BarChart,
      active: matchesPrefix(pathname, "/stats"),
    },
  ];

  return (
    <nav
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className={cn(
        "fixed bottom-0 left-0 z-30 block w-full border-t border-border bg-surface transition-transform duration-200 ease-out md:hidden",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex h-14 items-center justify-around px-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-sm px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              route.active ? "text-accent" : "text-fg-2 hover:text-fg"
            )}
          >
            <route.icon className="h-5 w-5" />
            <span>{route.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
