import { Card, CardContent } from "@/components/ui/card";

export interface AreaMetricItem {
  label: string;
  value: string;
  note: string;
}

export default function AreaMetricGrid({ items }: { items: AreaMetricItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-black/20"
        >
          <CardContent className="space-y-2 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              {item.label}
            </p>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {item.value}
            </p>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
