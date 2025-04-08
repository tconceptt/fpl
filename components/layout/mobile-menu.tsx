"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart, Menu, Zap, Trophy, Home, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMenu() {
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
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="py-1 px-2 text-sm font-medium text-white">
            FPL Summarizer
          </div>
          {routes.map((route) => (
            <DropdownMenuItem key={route.href} asChild>
              <Link
                href={route.href}
                className={cn(
                  "flex items-center gap-2",
                  route.active && "font-medium"
                )}
              >
                <route.icon className="h-4 w-4" />
                {route.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 