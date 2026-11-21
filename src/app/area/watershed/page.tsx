"use client";

import { Suspense } from "react";
import { CLASS_ID } from "@/data/constants";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Droplets, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LulcBarChart from "@/components/charts/LulcBarChart";
import LulcPieChart from "@/components/charts/LulcPieChart";
import LulcTimeSeriesChart from "@/components/charts/LulcTimeSeriesChart";
import AreaActionPlan from "@/components/area/AreaActionPlan";
import AreaMetricGrid from "@/components/area/AreaMetricGrid";
import AreaNarrativePanel from "@/components/area/AreaNarrativePanel";
import AreaValidationPanel from "@/components/area/AreaValidationPanel";
import { useLulcData } from "@/hooks/useLulcData";
import { useAreaData } from "@/hooks/useAreaData";
import { usePipelineReady } from "@/hooks/usePipelineReady";
import PipelineEmptyState from "@/components/shared/PipelineEmptyState";
import { getProvinceLulcData } from "@/data/stats";
import {
  getAreaNarrative,
  getClassPercentage,
  getComparisonMetrics,
  getNetChange,
  getValidationStory,
  getYearData,
} from "@/lib/area-insights";

export default function WatershedPage() {
  return (
    <Suspense>
      <WatershedContent />
    </Suspense>
  );
}

function WatershedContent() {
  const { profile } = useLulcData("watershed");
  const { provinces, municipalities } = useAreaData();
  const { isReady } = usePipelineReady();

  if (isReady === null) return null;
  if (!isReady)
    return (
      <PipelineEmptyState
        description="Run the pipeline simulation to generate watershed-level land cover data and planning suggestions."
        preview={[
          "Full basin LULC trend from 2015 to 2025",
          "Built-up growth, agriculture loss, and forest change",
          "Basin-wide action plan and model validation",
        ]}
      />
    );

  if (!profile) return null;

  const data2015 = getYearData(profile, 2015);
  const data2025 = getYearData(profile, 2025);

  const narrative = getAreaNarrative(profile, {
    areaName: "Laguna de Bay Watershed",
    areaType: "watershed",
    municipalityCount: municipalities.length,
    isLakeAdjacent: true,
  });

  const validationStory = getValidationStory(2025);

  const metrics = [
    ...getComparisonMetrics(profile),
    {
      label: "Municipalities covered",
      value: `${municipalities.length} LGUs`,
      note: `Grouped into ${provinces.length} province-level views for comparison.`,
    },
    {
      label: "Shoreline-sensitive LGUs",
      value: `${municipalities.filter((c) => c.isLakeAdjacent).length}`,
      note: "These places need stronger runoff and setback controls due to direct lake proximity.",
    },
  ];

  const changeCards = [
    {
      title: "Built-up change since 2015",
      value: `${getNetChange(profile, CLASS_ID.BUILT_UP, 2015, 2025).toFixed(1)} pts`,
      note: "How much land shifted into urban or built-up use across the whole basin over the observed decade.",
    },
    {
      title: "Agriculture shift since 2015",
      value: `${getNetChange(profile, CLASS_ID.AGRICULTURE, 2015, 2025).toFixed(1)} pts`,
      note: "Farmland loss across the basin — a sign of how much productive land has been absorbed by expansion.",
    },
    {
      title: "Forest shift since 2015",
      value: `${getNetChange(profile, CLASS_ID.FOREST, 2015, 2025).toFixed(1)} pts`,
      note: "Observed green cover change across the basin over the classified decade.",
    },
  ];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_#fafaf9_0%,_#ffffff_38%,_#f8fafc_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,_#09090b_0%,_#09090b_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/area" className="inline-flex items-center gap-2 hover:text-zinc-950 dark:hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Areas
          </Link>
          <span>/</span>
          <span>Watershed Overview</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/95 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/70 dark:bg-zinc-950/85 dark:shadow-black/20">
          <div className="grid gap-6 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.3fr_0.8fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{municipalities.length} LGUs across {provinces.length} provinces</Badge>
                <Badge variant="secondary">Lakeside basin</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
                Laguna de Bay Watershed
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                This is the basin-wide planning view. It shows how land cover is shifting across the entire Laguna de Bay watershed — from the most built-up urban fringe to the remaining agricultural lowlands and upland forest cover — and what the most important basin-wide responses are.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Preview on the map
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
                  <Building2 className="h-5 w-5" />
                  <p className="font-semibold">Basin-wide built-up (2025)</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {data2025?.classes.find((e) => e.classId === CLASS_ID.BUILT_UP)?.percentage.toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Share of the entire watershed that is already urbanized or built over as of the current baseline.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
                  <Droplets className="h-5 w-5" />
                  <p className="font-semibold">2015 baseline</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {data2015?.classes.find((e) => e.classId === CLASS_ID.BUILT_UP)?.percentage.toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Basin-wide built-up share at the start of the observed decade, from the classified 2015 map.
                </p>
              </div>
            </div>
          </div>
        </section>

        <AreaMetricGrid items={metrics} />

        <AreaNarrativePanel narrative={narrative} />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">Current land mix (2025)</CardTitle>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                What the basin is mostly made of right now — a starting point for understanding where change pressure is concentrated.
              </p>
            </CardHeader>
            <CardContent>
              <LulcPieChart data={data2025} height={320} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">2015 baseline land mix</CardTitle>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                How the basin looked at the start of the observed decade — compare against the current view to see what changed.
              </p>
            </CardHeader>
            <CardContent>
              <LulcBarChart data={data2015} height={320} />
            </CardContent>
          </Card>
        </section>

        <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Full timeline (2015 – 2025)</CardTitle>
            <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              Stacked area chart showing how each land cover class shifted across the three classified years.
            </p>
          </CardHeader>
          <CardContent>
            <LulcTimeSeriesChart profile={profile} height={320} />
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Change Readout
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              What changed across the whole basin
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {changeCards.map((item) => (
              <Card
                key={item.title}
                className="border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20"
              >
                <CardContent className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    {item.title}
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{item.value}</p>
                  <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Basin-wide Response
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Practical actions for the whole watershed
            </h2>
          </div>
          <AreaActionPlan actions={narrative.actions} />
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Province Breakdown
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Where the pressure is strongest
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {provinces.map((province) => {
              const provinceProfile = {
                slug: province.slug,
                name: province.name,
                type: "province" as const,
                yearlyData: getProvinceLulcData(province.slug),
              };
              const prov2015 = getYearData(provinceProfile, 2015);
              const prov2025 = getYearData(provinceProfile, 2025);
              const provChange = getClassPercentage(prov2025, CLASS_ID.BUILT_UP) - getClassPercentage(prov2015, CLASS_ID.BUILT_UP);
              const provNarrative = getAreaNarrative(provinceProfile, {
                areaName: province.name,
                areaType: "province",
                municipalityCount: province.municipalityCount,
              });

              return (
                <Link key={province.slug} href={`/area/province/${province.slug}`} className="block h-full">
                  <Card className="h-full border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-zinc-500" />
                          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{province.name}</h3>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                          {provNarrative.toneLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">2025 built-up</p>
                          <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {getClassPercentage(prov2025, CLASS_ID.BUILT_UP).toFixed(1)}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Change since 2015</p>
                          <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {provChange >= 0 ? "+" : ""}{provChange.toFixed(1)} pts
                          </p>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 line-clamp-3">
                        {province.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <AreaValidationPanel story={validationStory} />
      </div>
    </div>
  );
}
