"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  animate?: boolean;
}

function useCountUp(end: number, duration: number = 1500, active: boolean = true) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const start = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration, active]);

  return count;
}

export default function StatCard({
  title,
  value,
  suffix,
  prefix,
  description,
  icon: Icon,
  trend,
  className,
  animate = true,
}: StatCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue);
  const animatedValue = useCountUp(
    isNumeric ? numericValue : 0,
    1500,
    animate && isNumeric
  );

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {prefix}
              {animate && isNumeric
                ? animatedValue.toLocaleString()
                : typeof value === "number"
                ? value.toLocaleString()
                : value}
              {suffix}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded",
                trend.value > 0
                  ? "text-red-700 bg-red-50"
                  : trend.value < 0
                  ? "text-green-700 bg-green-50"
                  : "text-gray-700 bg-gray-50"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
