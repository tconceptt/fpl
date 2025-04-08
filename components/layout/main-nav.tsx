"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/league",
      label: "League",
      icon: Trophy,
      active: pathname === "/league",
    },
    {
      href: "/prizes",
      label: "Prizes",
      icon: Banknote,
      active: pathname === "/prizes",
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
    <nav className="hidden md:flex md:gap-6">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <span className="font-bold">FPL Summarizer</span>
      </Link>
      <div className="flex gap-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-1 text-sm font-medium transition-colors hover:text-white",
              route.active ? "text-white" : "text-white/60"
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