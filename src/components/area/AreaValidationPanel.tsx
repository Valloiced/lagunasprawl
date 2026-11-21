import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationStory } from "@/lib/area-insights";

export default function AreaValidationPanel({ story }: { story: ValidationStory }) {
  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
      <CardHeader className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
          Accuracy and Validation
        </p>
        <CardTitle className="text-2xl tracking-tight text-zinc-950 dark:text-zinc-50">
          How reliable is the classification?
        </CardTitle>
        <p className="max-w-4xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">{story.summary}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {story.cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{card.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {story.classRows.map((row) => (
            <div
              key={row.className}
              className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/45"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.className.replace(/_/g, " ")}</p>
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{row.label}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                  style={{ width: `${row.value}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{row.note}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
