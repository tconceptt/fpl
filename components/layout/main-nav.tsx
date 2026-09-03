"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home, Swords, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainNav() {
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
      href: "/h2h",
      label: "H2H",
      icon: Swords,
      active: pathname === "/h2h",
    },
    {
      href: "/transfers",
      label: "Transfers",
      icon: ArrowRightLeft,
      active: pathname === "/transfers",
    },
    {
      href: "/stats",
      label: "Stats",
      icon: BarChart,
      active: pathname === "/stats",
    },
  ];

  return (
    <nav className="hidden md:flex items-center gap-6">
      <Link href="/" className="text-lg font-bold text-white">
        FPL
      </Link>
      <div className="flex items-center gap-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10",
              route.active ? "bg-white/20 text-white" : "text-white/70"
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