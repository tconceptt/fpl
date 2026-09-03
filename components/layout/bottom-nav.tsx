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

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide nav on any downward scroll, show when scrolling up or at very top
      if (currentScrollY > lastScrollY.current && currentScrollY > 5) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current || currentScrollY <= 5) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
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
        "fixed bottom-0 left-0 z-30 block w-full md:hidden transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Subtle backdrop with blur */}
      <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-lg border-t border-white/10" />

      {/* Navigation content */}
      <div className="relative container flex justify-around items-center px-2 py-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium transition-all duration-200 rounded-lg",
              route.active
                ? "bg-gradient-to-r from-purple-900/30 to-blue-900/30 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
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
