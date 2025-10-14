"use client";

import { GameweekSelector } from "@/components/gameweek-selector";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageHeaderProps {
  title: string;
  description: string;
  currentGameweek: number;
  selectedGameweek: number;
  showGameweekSelector?: boolean;
  simpleSelector?: boolean;
}

export function PageHeader({
  title,
  description,
  currentGameweek,
  selectedGameweek,
  showGameweekSelector = true,
  simpleSelector = false,
}: PageHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameweeks = Array.from({ length: currentGameweek }, (_, i) => i + 1);
  const currentValue = selectedGameweek.toString();

  const handleGameweekChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('gameweek', value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {showGameweekSelector && !simpleSelector && (
            <GameweekSelector 
              currentGameweek={currentGameweek}
              selectedGameweek={selectedGameweek}
              className="w-auto"
            />
          )}
          {showGameweekSelector && simpleSelector && (
            <div className="w-fit">
              <Select value={currentValue} onValueChange={handleGameweekChange}>
                <SelectTrigger className="h-auto border-0 bg-purple-900/20 hover:bg-purple-900/30 shadow-none focus:ring-0 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold min-w-[55px] sm:min-w-[70px] rounded-md transition-colors">
                  <SelectValue placeholder="Select gameweek" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border border-purple-500/30 rounded-lg shadow-2xl">
                  <SelectGroup>
                    <SelectLabel className="text-xs text-white/60 font-semibold px-3 py-2">Select Gameweek</SelectLabel>
                    <div className="max-h-[300px] overflow-y-auto px-1">
                      {gameweeks.map((gw) => (
                        <SelectItem 
                          key={gw} 
                          value={gw.toString()} 
                          className="cursor-pointer rounded-md my-0.5 text-sm hover:bg-purple-900/30 focus:bg-purple-900/40 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                        >
                          GW {gw}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <p className="text-sm text-white/60 mt-1">
          {description}
        </p>
      </div>
    </div>
  );
} 