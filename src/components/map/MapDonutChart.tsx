"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LulcYearData } from "@/data/types";
import { getClassColor, getClassName, CLASS_ID } from "@/data/constants";

interface MapDonutChartProps {
  data: LulcYearData | undefined;
  /** first observed year, used as the change baseline */
  baseline?: LulcYearData | undefined;
}

export default function MapDonutChart({ data, baseline }: MapDonutChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.classes
      .filter((c) => c.areaHa > 0)
      .map((c) => {
        const base = baseline?.classes.find((b) => b.classId === c.classId);
        // share alone hides the story: built-up moving 17.4% -> 27.3% of the
        // watershed is only ~10 points, but it is a 57% increase in area. Carry
        // both so switching years reads as the change it actually is.
        const deltaHa = base ? c.areaHa - base.areaHa : 0;
        const deltaPct = base && base.areaHa > 0 ? (100 * deltaHa) / base.areaHa : 0;
        return {
          name: getClassName(c.classId),
          value: c.percentage,
          areaHa: c.areaHa,
          km2: c.areaHa / 100,
          deltaKm2: deltaHa / 100,
          deltaPct,
          hasBase: !!base && base.areaHa > 0,
          // built-up expanding is the pressure signal; every other class
          // SHRINKING is. Colouring purely by sign made forest recovery look
          // like a warning and farmland loss look like good news.
          concerning:
            c.classId === CLASS_ID.BUILT_UP ? deltaHa > 0 : deltaHa < 0,
          color: getClassColor(c.classId),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, baseline]);

  const baseYear = baseline?.year;
  const showDelta = !!baseline && baseline.year !== data?.year;

  if (!data || chartData.length === 0) {
    return <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">No data</div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Chart Section */}
      <div className="relative h-[120px] w-full flex items-center justify-center drop-shadow-sm">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={52}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-900/90 text-zinc-50 border border-zinc-800 backdrop-blur-md p-2 rounded-lg text-xs shadow-xl">
                      <p className="font-semibold mb-1">{data.name}</p>
                      <p className="text-zinc-300">
                        <span className="font-bold text-white">
                          {data.km2.toFixed(0)} km²
                        </span>{" "}
                        · {data.value.toFixed(1)}% of basin
                      </p>
                      {data.hasBase && Math.abs(data.deltaKm2) >= 0.5 && (
                        <p className="mt-0.5 text-zinc-400">
                          {data.deltaKm2 > 0 ? "+" : ""}
                          {data.deltaKm2.toFixed(0)} km² (
                          {data.deltaPct > 0 ? "+" : ""}
                          {data.deltaPct.toFixed(0)}%) since {baseYear}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Simplified Center Content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border border-zinc-200/20 dark:border-zinc-800/20 flex items-center justify-center">
             <div className="w-10 h-10 rounded-full bg-zinc-100/10 dark:bg-zinc-900/10" />
          </div>
        </div>
      </div>

      {/* All Classes Legend Section */}
      <div className="mt-3 flex flex-col gap-y-2 px-1">
        {chartData.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="truncate text-muted-foreground font-medium">{entry.name}</span>
            </div>
            <div className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
              <span className="font-bold text-foreground">
                {entry.km2.toFixed(0)} km²
              </span>
              <span className="text-muted-foreground">{entry.value.toFixed(1)}%</span>
              {showDelta && entry.hasBase && Math.abs(entry.deltaKm2) >= 0.5 && (
                <span
                  className={
                    "rounded px-1 py-0.5 text-[9px] font-bold " +
                    (entry.concerning
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")
                  }
                >
                  {entry.deltaPct > 0 ? "+" : ""}
                  {entry.deltaPct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {showDelta && (
        <p className="mt-2 px-1 text-[9px] leading-snug text-muted-foreground">
          Badges show change in area since {baseYear}, not change in share. Red
          marks the direction that adds pressure: built-up growing, or any other
          cover shrinking.
        </p>
      )}
    </div>
  );
}
