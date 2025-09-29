"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/",
      label: "League",
      icon: Trophy,
      active: pathname === "/",
    },
    {
      href: "/gameweek",
      label: "Gameweek",
      icon: Zap,
      active: pathname === "/gameweek",
    },
    {
      href: "/stats",
      label: "Stats",
      icon: BarChart,
      active: pathname === "/stats",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-30 block w-full border-t border-white/10 bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container flex justify-around">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md p-2 text-xs font-medium transition-colors hover:bg-white/10",
              route.active ? "text-white" : "text-white/60"
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
