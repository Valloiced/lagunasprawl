"use client";

import { cn } from "@/lib/utils";
import { AVAILABLE_YEARS } from "@/data/constants";
import { Year } from "@/data/types";

interface YearToggleProps {
  selectedYear: Year;
  onChange: (year: Year) => void;
  years?: Year[];
  className?: string;
}

export default function YearToggle({
  selectedYear,
  onChange,
  years = AVAILABLE_YEARS,
  className,
}: YearToggleProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {years.map((year) => {
        const active = selectedYear === year;
        return (
          <button
            key={year}
            onClick={() => onChange(year)}
            className={cn(
              "relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
