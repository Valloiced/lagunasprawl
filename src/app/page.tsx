"use client";

import Link from "next/link";
import { CLASS_ID } from "@/data/constants";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Map,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LulcBarChart from "@/components/charts/LulcBarChart";
import LulcPieChart from "@/components/charts/LulcPieChart";
import YearToggle from "@/components/shared/YearToggle";
import AreaActionPlan from "@/components/area/AreaActionPlan";
import AreaMetricGrid from "@/components/area/AreaMetricGrid";
import AreaNarrativePanel from "@/components/area/AreaNarrativePanel";
import AreaValidationPanel from "@/components/area/AreaValidationPanel";
import { Year } from "@/data/types";
import { useAreaData } from "@/hooks/useAreaData";
import { useLulcData } from "@/hooks/useLulcData";
import { usePipelineReady } from "@/hooks/usePipelineReady";
import PipelineEmptyState from "@/components/shared/PipelineEmptyState";
import {
  getAreaNarrative,
  getClassPercentage,
  getComparisonMetrics,
  getValidationStory,
  getYearData,
} from "@/lib/area-insights";

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<Year>(2025);
  const { profile: watershedProfile } = useLulcData("watershed");
  const { provinces, municipalities } = useAreaData();
  const { isReady } = usePipelineReady();

  const currentYearData = watershedProfile?.yearlyData.find((entry) => entry.year === selectedYear);

  const watershedNarrative = useMemo(() => {
    if (!watershedProfile) return null;
    return getAreaNarrative(watershedProfile, {
      areaName: "Laguna de Bay Watershed",
      areaType: "watershed",
      municipalityCount: municipalities.length,
    });
  }, [municipalities.length, watershedProfile]);

  const topMetrics = useMemo(() => {
    if (!watershedProfile) return [];

    return [
      ...getComparisonMetrics(watershedProfile),
      {
        label: "Coverage",
        value: `${municipalities.length} LGUs`,
        note: `Tracked across ${provinces.length} province-level views in the app.`,
      },
      {
        label: "Selected view",
        value: `${selectedYear}`,
        note: "This year is an observed, classified map view used in the dashboard.",
      },
    ];
  }, [municipalities.length, provinces.length, selectedYear, watershedProfile]);

  const validationStory = useMemo(() => getValidationStory(2025), []);

  const topClasses = useMemo(() => {
    if (!currentYearData) return [];

    return [...currentYearData.classes]
      .sort((left, right) => right.percentage - left.percentage)
      .slice(0, 3)
      .map((entry) => ({
        name: entry.className.replace(/_/g, " "),
        percentage: entry.percentage.toFixed(1),
      }));
  }, [currentYearData]);

  if (isReady === null) return null;
  if (!isReady) return (
    <PipelineEmptyState
      description="Run the pipeline simulation to generate LULC statistics, year-by-year charts, and area summaries for the Laguna de Bay watershed."
      preview={[
        "LULC distribution charts for 2015, 2020, and 2025",
        "Built-up growth trend and comparison metrics",
        "Province and municipality quick-links with data",
      ]}
    />
  );

  if (!watershedProfile || !watershedNarrative || !currentYearData) {
    return null;
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_40%,_#f8fafc_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.24),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(154,52,18,0.18),_transparent_26%),linear-gradient(180deg,_#09090b_0%,_#09090b_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-900/60 bg-zinc-950 text-white shadow-xl shadow-zinc-300/40 dark:border-zinc-800/70 dark:shadow-black/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.34),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.26),_transparent_26%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(24,24,27,0.95)_52%,_rgba(9,9,11,0.98)_100%)]" />
          <div className="absolute right-0 top-0 hidden h-full w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_58%)] xl:block" />
          <div className="absolute -right-10 -top-10 hidden opacity-15 xl:block">
            <Map className="h-72 w-72 text-white" />
          </div>
          <div className="relative grid gap-8 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.4fr_0.9fr]">
            <div>
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 text-white dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                Watershed Dashboard
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                A clearer snapshot of how the Laguna de Bay watershed is changing and where growth pressure is building.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-200">
                This dashboard turns the land-cover model into a fast overview for planning and communication. It highlights the current land mix, shows where built-up land is rising, and points you to the map and area pages for deeper local suggestions.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  <MapPin className="h-4 w-4" />
                  Open Interactive Map
                </Link>
                <Link
                  href="/area"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/16 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/16"
                >
                  Browse Areas
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/simulation"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/16 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/16"
                >
                  Watch the Algorithm Run
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-white">
                  <Sparkles className="h-5 w-5" />
                  <p className="font-semibold">Current readout</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {getClassPercentage(getYearData(watershedProfile, 2025), CLASS_ID.BUILT_UP).toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-200">
                  Built-up share in the 2025 watershed view. This is the easiest starting point for understanding how much land is already urbanized.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-white">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-semibold">Validation snapshot</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {validationStory.cards[0]?.value}
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-200">
                  The reviewed 2025 classifier reached a kappa of {validationStory.cards[1]?.value}, which is strong enough to support planning conversations while still leaving room for local validation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <AreaMetricGrid items={topMetrics} />

        <AreaNarrativePanel narrative={watershedNarrative} />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl tracking-tight">Land mix by year</CardTitle>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                    Use the year switch to compare observed and generated views of the watershed without leaving the dashboard.
                  </p>
                </div>
                <YearToggle selectedYear={selectedYear} onChange={setSelectedYear} />
              </div>
            </CardHeader>
            <CardContent>
              <LulcPieChart data={currentYearData} height={340} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">What stands out in {selectedYear}</CardTitle>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                This companion chart makes the same year easier to compare class by class, while the summary cards below highlight the biggest land-cover shares.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <LulcBarChart data={currentYearData} height={250} />
              <div className="grid gap-3 sm:grid-cols-3">
                {topClasses.map((entry) => (
                  <div
                    key={entry.name}
                    className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      {entry.name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {entry.percentage}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Priority Moves
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Basin-wide actions the dashboard is pointing toward
            </h2>
          </div>
          <AreaActionPlan actions={watershedNarrative.actions} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Province Outlooks
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Quick links into the deeper area pages
              </h2>
            </div>
            <Link
              href="/area"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Open all areas
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {provinces.map((province) => (
              <ProvinceSnapshotCard key={province.slug} slug={province.slug} name={province.name} municipalityCount={province.municipalityCount} />
            ))}
          </div>
        </section>

        <AreaValidationPanel story={validationStory} />
      </div>
    </div>
  );
}

function ProvinceSnapshotCard({
  slug,
  name,
  municipalityCount,
}: {
  slug: string;
  name: string;
  municipalityCount: number;
}) {
  const { profile } = useLulcData("province", slug);

  if (!profile) return null;

  const data2015 = getYearData(profile, 2015);
  const data2025 = getYearData(profile, 2025);
  const builtChange = getClassPercentage(data2025, CLASS_ID.BUILT_UP) - getClassPercentage(data2015, CLASS_ID.BUILT_UP);

  return (
    <Link href={`/area/province/${slug}`} className="block h-full">
      <Card className="h-full border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">{municipalityCount} LGUs</Badge>
            <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900">
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
          </div>
          <CardTitle className="text-2xl tracking-tight">{name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/65">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">2025 built-up</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {getClassPercentage(data2025, CLASS_ID.BUILT_UP).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/65">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Change since 2015</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {builtChange >= 0 ? "+" : ""}{builtChange.toFixed(1)} pts
              </p>
            </div>
          </div>

          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            Open the province page to read the local summary, see suggested responses, and browse the city and municipality profiles underneath it.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            View province details
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
