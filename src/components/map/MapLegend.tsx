"use client";

import { LULC_CLASSES } from "@/data/constants";

export default function MapLegend() {
  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur pb-4 pt-3 px-4 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 pointer-events-auto">
      <h4 className="text-sm font-semibold mb-3">LULC Classes</h4>
      <div className="flex flex-col gap-2.5">
        {LULC_CLASSES.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-xs font-medium">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
