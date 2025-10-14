"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart, Zap, Trophy, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide nav on any downward scroll, show when scrolling up or at very top
      if (currentScrollY > lastScrollY && currentScrollY > 5) {
        // Scrolling down - hide immediately
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= 5) {
        // Scrolling up or at very top - show
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Add scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
    <nav 
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
              "flex flex-col items-center gap-1 px-3 py-1.5 text-[9px] font-medium transition-all duration-200 rounded-lg",
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
