"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MUNICIPAL_SIM, MunicipalSim } from "@/data/generated/municipal-sim.generated";
import {
  Search,
  Flame,
  Building2,
  TrendingUp,
  Landmark,
  Factory,
  AlertTriangle,
} from "lucide-react";

const WatershedMap = dynamic(() => import("@/components/map/WatershedMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  ),
});

type SortKey = "impact" | "growth" | "builtup" | "dpwh";

function statusColor(s: string) {
  if (/on-?going/i.test(s)) return "text-amber-600 dark:text-amber-400";
  if (/not/i.test(s)) return "text-sky-600 dark:text-sky-400";
  return "text-zinc-500";
}

// Small municipalities gain well under 1 km2, which toFixed(0) reported as
// "about 0 km2 of built-up land ... (411.1% increase)".
function km2(v: number): string {
  return v < 10 ? v.toFixed(2) : v.toFixed(0);
}

function narrative(m: MunicipalSim): string {
  const gain = m.builtUp2025 - m.builtUp2015;
  const pct = m.growthPct2015_2025;
  const parts: string[] = [];
  parts.push(
    `${m.name} added about ${km2(gain)} km² of built-up land between 2015 and 2025` +
      // null when the 2015 base was too small to divide by (see s11).
      (pct === null ? "." : ` (${pct}% increase).`)
  );
  if (m.forecastPressure > 0.25)
    parts.push("Model flags high remaining conversion pressure on its developable land.");
  else if (m.forecastPressure > 0.12)
    parts.push("Model flags moderate future conversion pressure.");
  else parts.push("Future conversion pressure is relatively low.");
  if (m.dpwhCount > 0) {
    const many = m.dpwhCount > 1;
    parts.push(
      `${m.dpwhCount} DPWH road project${many ? "s" : ""} worth ₱${m.dpwhBudgetB}B ${many ? "are" : "is"} ongoing or planned, which can open new land for development.`
    );
  }
  if (m.pezaCount > 0) {
    const many = m.pezaCount > 1;
    parts.push(`${m.pezaCount} economic zone${many ? "s" : ""} add${many ? "" : "s"} industrial-led pressure.`);
  }
  return parts.join(" ");
}

export default function SimulatePage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("impact");
  const [selectedSlug, setSelectedSlug] = useState(MUNICIPAL_SIM[0]?.slug);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MUNICIPAL_SIM.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.province.toLowerCase().includes(q)
    );
    const key: Record<SortKey, (m: MunicipalSim) => number> = {
      impact: (m) => m.impactScore,
      // sorts descending, so a null base ranks last rather than first
      growth: (m) => m.growthPct2015_2025 ?? -Infinity,
      builtup: (m) => m.builtUp2025,
      dpwh: (m) => m.dpwhBudgetB,
    };
    return [...filtered].sort((a, b) => key[sort](b) - key[sort](a));
  }, [query, sort]);

  const m = MUNICIPAL_SIM.find((x) => x.slug === selectedSlug) ?? MUNICIPAL_SIM[0];
  // builtUp2040 is optional - s11 omits it when the extended-horizon raster
  // was not produced, so the bar and the metric card drop out together.
  const traj = [
    { y: "2015", v: m.builtUp2015 },
    { y: "2020", v: m.builtUp2020 },
    { y: "2025", v: m.builtUp2025 },
    { y: "2035", v: m.builtUp2035, projected: true },
    ...(m.builtUp2040 === undefined
      ? []
      : [{ y: "2040", v: m.builtUp2040, projected: true, extended: true }]),
  ];
  // Scale to the municipality's own range. The old `, 1` floor meant a town
  // topping out at 0.32 km2 drew every bar under a third of the panel; where
  // all four rounded to 0.00 the chart rendered empty. s11 now drops those
  // (built-up < 0.25 km2), and `|| 1` only guards a divide by zero.
  const maxV = Math.max(...traj.map((t) => t.v)) || 1;

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in px-4 py-8 duration-500 md:px-8">
      <div className="mb-1 flex items-center gap-2">
        <Flame className="h-6 w-6 text-orange-500" />
        <h1 className="text-3xl font-bold tracking-tight">Municipality Simulation</h1>
      </div>
      <p className="max-w-3xl text-muted-foreground">
        Per-city growth pressure, built-up trajectory, and the infrastructure and
        industrial projects most likely to drive future conversion. Ranked by a
        composite impact score.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Ranked list */}
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search municipality…"
                className="w-full rounded-lg bg-zinc-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800"
              />
            </div>
            <div className="mt-2 flex gap-1">
              {([
                ["impact", "Impact"],
                ["growth", "Growth %"],
                ["builtup", "Built-up"],
                ["dpwh", "DPWH ₱"],
              ] as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    sort === k
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-muted-foreground dark:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {list.map((mu) => (
              <button
                key={mu.slug}
                onClick={() => setSelectedSlug(mu.slug)}
                className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2.5 text-left last:border-0 dark:border-zinc-800 ${
                  mu.slug === m.slug
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                  {mu.rank}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{mu.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {mu.province}
                  </span>
                </span>
                {mu.rank <= 10 && (
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    High
                  </span>
                )}
                <div className="h-8 w-14 shrink-0">
                  <div className="flex h-full items-end justify-end">
                    <div
                      className="w-2 rounded-t bg-indigo-500"
                      style={{ height: `${Math.max(6, mu.impactScore * 100)}%` }}
                      title={`Impact ${mu.impactScore}`}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{m.name}</h2>
                {m.rank <= 10 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    <Flame className="h-3 w-3" /> High impact · rank {m.rank}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {m.province} · {m.areaKm2} km² in watershed
              </p>
            </div>
          </div>

          {/* metric cards */}
          <div
            className={`grid grid-cols-2 gap-3 ${
              m.builtUp2040 === undefined ? "sm:grid-cols-4" : "sm:grid-cols-5"
            }`}
          >
            <MetricCard icon={Building2} label="Built-up 2025" value={`${m.builtUp2025} km²`} />
            <MetricCard
              icon={TrendingUp}
              label="Projected 2035"
              value={`${m.builtUp2035} km²`}
              hint="BAU"
            />
            {m.builtUp2040 !== undefined && (
              <MetricCard
                icon={TrendingUp}
                label="Projected 2040"
                value={`${m.builtUp2040} km²`}
                hint="BAU · extended"
              />
            )}
            <MetricCard
              icon={Flame}
              label="Growth pressure"
              value={m.forecastPressure.toFixed(2)}
              hint="0–1"
            />
            <MetricCard
              icon={TrendingUp}
              label="Growth 2015–25"
              value={
                m.growthPct2015_2025 === null
                  ? "n/a"
                  : `+${m.growthPct2015_2025}%`
              }
              hint={
                m.growthPct2015_2025 === null ? "2015 base too small" : undefined
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* map */}
            <div className="h-[300px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <WatershedMap
                selectedYear={2025}
                selectedArea={null}
                onSelectArea={() => {}}
                activeLayers={["forecast", "peza", "dpwh"]}
                showLulc={false}
                focus={{ center: m.center, zoom: 12 }}
                highlightSlug={m.slug}
              />
            </div>

            {/* trajectory */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="mb-3 text-sm font-semibold">Built-up trajectory</p>
              {/*
                The bars need a containing block with a DEFINITE height or their
                percentage height is circular - the column sizes to its content,
                the bar is that content, and CSS resolves the percentage to auto,
                which is 0 for an empty div. That is why this chart rendered as
                bare numbers with no bars at all.

                So: items-stretch (not items-end) plus h-full gives each column
                the row's 160px, and the bar sits absolutely inside a flex-1
                track whose height flex layout has already resolved.
              */}
              <div className="flex h-40 items-stretch gap-3">
                {traj.map((t) => (
                  <div key={t.y} className="flex h-full flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {km2(t.v)}
                    </span>
                    <div className="relative w-full flex-1">
                      <div
                        className={`absolute bottom-0 w-full rounded-t ${
                          t.projected
                            ? `${t.extended ? "bg-orange-400/40" : "bg-orange-400/70"} [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,.4)_4px,rgba(255,255,255,.4)_8px)]`
                            : "bg-indigo-500"
                        }`}
                        // floor at 2% so a near-zero first year stays a visible
                        // sliver instead of collapsing to nothing
                        style={{ height: `${Math.max(2, (t.v / maxV) * 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        t.extended ? "text-muted-foreground" : ""
                      }`}
                    >
                      {t.y}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                2015–2025 are classified observations. Hatched bars are counted off the
                CA forecast rasters under the business-as-usual scenario.
                {m.builtUp2040 !== undefined && (
                  <>
                    {" "}
                    2040 is faded because it is three CA steps past the last observation,
                    with population, night lights and road distances all held fixed.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* narrative */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-900">
            {narrative(m)}
          </div>

          {/* projects + industrial */}
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-bold">High-impact future projects</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {m.dpwhCount} projects · ₱{m.dpwhBudgetB}B
                </span>
              </div>
              {m.topProjects.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No ongoing or planned DPWH road projects recorded in this municipality.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {m.topProjects.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 py-2">
                      <span className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:bg-zinc-800">
                        ₱{p.budgetM}M
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs leading-snug">{p.name}</span>
                        <span className={`text-[10px] font-medium ${statusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-1 flex items-center gap-2">
                  <Factory className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-bold">Economic zones</h3>
                </div>
                <p className="text-3xl font-bold">{m.pezaCount}</p>
                <p className="text-xs text-muted-foreground">
                  PEZA / industrial estates driving industrial-led conversion.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Impact score blends forecast pressure, built-up gain, DPWH investment
                  and economic zones. It is a ranking aid, not a model output — only the
                  built-up figures come from the classified and forecast rasters.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">
        {value}
        {hint && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </p>
    </div>
  );
}
