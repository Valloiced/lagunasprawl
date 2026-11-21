import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaAction } from "@/lib/area-insights";

const ACCENT_STYLES = {
  rose: "border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20",
  amber: "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20",
  emerald: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20",
  blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/20",
} as const;

export default function AreaActionPlan({ actions }: { actions: AreaAction[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {actions.map((action) => (
        <Card
          key={`${action.title}-${action.timeframe}`}
          className={`border shadow-sm shadow-zinc-200/40 dark:shadow-black/20 ${ACCENT_STYLES[action.accent]}`}
        >
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              {action.timeframe}
            </p>
            <CardTitle className="text-xl leading-7 text-zinc-950 dark:text-zinc-50">
              {action.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{action.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
