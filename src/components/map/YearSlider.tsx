"use client";

import {
  AVAILABLE_YEARS,
  PROJECTED_YEARS,
  EXTENDED_HORIZON_YEARS,
} from "@/data/constants";
import { Year } from "@/data/types";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface YearSliderProps {
  selectedYear: Year;
  onChange: (year: Year) => void;
}

export default function YearSlider({ selectedYear, onChange }: YearSliderProps) {
  const currentIndex = AVAILABLE_YEARS.indexOf(selectedYear);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index) && AVAILABLE_YEARS[index]) {
      onChange(AVAILABLE_YEARS[index]);
    }
  };

  if (!isMounted) {
    return (
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[90vw] md:w-[400px] h-[120px] flex items-center justify-center">
        <div className="animate-pulse w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-4 px-6 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 pointer-events-auto w-[90vw] md:w-[400px] transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <CalendarClock className="w-4 h-4 text-indigo-500" />
          <span>Temporal Analysis</span>
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
            {selectedYear}
          </span>
        </div>
      </div>
      
      <div className="relative group">
        <input
          type="range"
          min="0"
          max={AVAILABLE_YEARS.length - 1}
          step="1"
          value={currentIndex}
          onChange={handleChange}
          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-4
            [&::-webkit-slider-thumb]:border-indigo-600
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-4
            [&::-moz-range-thumb]:border-indigo-600
            [&::-moz-range-thumb]:shadow-md"
        />

        <div className="flex justify-between items-center px-0.5 mt-4">
          {AVAILABLE_YEARS.map((y, i) => {
            const projected = PROJECTED_YEARS.includes(y);
            const extended = EXTENDED_HORIZON_YEARS.includes(y);
            return (
            <div key={y} className="flex flex-col items-center gap-1">
              <div 
                className={cn(
                  "w-1 h-1 rounded-full transition-all duration-300",
                  // observed years read solid; projections are hollow-amber so a
                  // forecast never looks like a measurement on the slider
                  extended
                    ? "bg-amber-500 ring-1 ring-amber-400"
                    : projected
                      ? "bg-amber-400/70"
                      : "bg-zinc-300 dark:bg-zinc-700",
                  currentIndex === i ? "bg-indigo-500 scale-150" : ""
                )}
              />
              <span 
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  currentIndex === i 
                    ? "text-indigo-600 dark:text-indigo-400 font-bold translate-y-0.5 scale-110" 
                    : "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {y}
              </span>
              {extended && (
                <span className="text-[8px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  ext
                </span>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
