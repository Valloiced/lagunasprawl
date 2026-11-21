import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AreaNarrative } from "@/lib/area-insights";

const TONE_STYLES = {
  priority: "border-rose-300 bg-rose-50/80 text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/30 dark:text-rose-300",
  watch: "border-amber-300 bg-amber-50/80 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/30 dark:text-amber-300",
  steady: "border-emerald-300 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/30 dark:text-emerald-300",
} as const;

export default function AreaNarrativePanel({ narrative }: { narrative: AreaNarrative }) {
  return (
    <Card className="overflow-hidden border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
      <CardContent className="space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <Badge className={TONE_STYLES[narrative.tone]} variant="outline">
              {narrative.toneLabel}
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {narrative.headline}
            </h2>
            <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              {narrative.summary}
            </p>
          </div>
          <div className="max-w-sm rounded-2xl border border-dashed border-zinc-300/80 bg-zinc-50/80 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-300">
            {narrative.mapPrompt}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {narrative.keyPoints.map((point) => (
            <div
              key={point}
              className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/65 dark:text-zinc-300"
            >
              {point}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
