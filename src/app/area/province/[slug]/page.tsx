"use client";

import { Suspense } from "react";
import { CLASS_ID } from "@/data/constants";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LulcBarChart from "@/components/charts/LulcBarChart";
import LulcPieChart from "@/components/charts/LulcPieChart";
import AreaActionPlan from "@/components/area/AreaActionPlan";
import AreaMetricGrid from "@/components/area/AreaMetricGrid";
import AreaNarrativePanel from "@/components/area/AreaNarrativePanel";
import AreaValidationPanel from "@/components/area/AreaValidationPanel";
import { useAreaData } from "@/hooks/useAreaData";
import { useLulcData } from "@/hooks/useLulcData";
import { usePipelineReady } from "@/hooks/usePipelineReady";
import PipelineEmptyState from "@/components/shared/PipelineEmptyState";
import { getCityLulcData } from "@/data/stats";
import { getAreaNarrative, getComparisonMetrics, getValidationStory, getYearData, getClassPercentage } from "@/lib/area-insights";

export default function ProvincePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <ProvinceContent params={params} />
    </Suspense>
  );
}

function ProvinceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { provinces, getCitiesByProvince } = useAreaData();
  const province = provinces.find((entry) => entry.slug === slug);
  const { profile } = useLulcData("province", slug);
  const { isReady } = usePipelineReady();

  if (!province || !profile) {
    return <div className="p-8 text-sm text-zinc-500">Province not found.</div>;
  }

  if (isReady === null) return null;
  if (!isReady) return (
    <PipelineEmptyState
      description="Run the pipeline simulation to generate land cover data and planning insights for this province."
      preview={[
        "LULC trend charts for 2015, 2020, and 2025",
        "Built-up growth and agriculture shift metrics",
        "Municipal breakdown and local action plan",
      ]}
    />
  );

  const cities = getCitiesByProvince(slug);
  const data2015 = getYearData(profile, 2015);
  const data2025 = getYearData(profile, 2025);
  const builtChange = getClassPercentage(data2025, CLASS_ID.BUILT_UP) - getClassPercentage(data2015, CLASS_ID.BUILT_UP);
  const narrative = getAreaNarrative(profile, {
    areaName: province.name,
    areaType: "province",
    municipalityCount: province.municipalityCount,
  });
  const validationStory = getValidationStory(2025);
  const metrics = [
    ...getComparisonMetrics(profile),
    {
      label: "LGUs in this province view",
      value: `${province.municipalityCount}`,
      note: "Each local page carries its own suggestions, mitigation ideas, and local trend cards.",
    },
    {
      label: "Area within watershed",
      value: `${Math.round(province.areaHa).toLocaleString()} ha`,
      note: "This province's real land area inside the Laguna de Bay watershed boundary.",
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
          <span>{province.name}</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/95 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/70 dark:bg-zinc-950/85 dark:shadow-black/20">
          <div className="grid gap-6 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.3fr_0.8fr]">
            <div>
              <Badge variant="outline">{province.municipalityCount} LGUs in view</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
                {province.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                {province.description}
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  2025 built-up share
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {getClassPercentage(data2025, CLASS_ID.BUILT_UP).toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  This is the current urbanized share the province page is using as its baseline.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                  Change since 2015
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {builtChange >= 0 ? "+" : ""}{builtChange.toFixed(1)} pts
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  How much the built-up share grew over the observed decade in this province view.
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
              <CardTitle className="text-2xl tracking-tight">What the land mix looks like now</CardTitle>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                This chart shows the current balance of built-up land, agriculture, forest and vegetation, water, and open land in the province view.
              </p>
            </CardHeader>
            <CardContent>
              <LulcPieChart data={data2025} height={320} />
            </CardContent>
          </Card>

          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">How it looked in 2015</CardTitle>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                The baseline bars help non-technical readers compare today&apos;s land mix against the classified 2015 map without needing to interpret raw tables.
              </p>
            </CardHeader>
            <CardContent>
              <LulcBarChart data={data2015} height={320} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Suggested Province Response
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Practical steps local planners could prioritize
            </h2>
          </div>
          <AreaActionPlan actions={narrative.actions} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Local Pages
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Cities and municipalities inside {province.name}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cities.map((city) => {
              const cityProfile = {
                slug: city.slug,
                name: city.name,
                type: "city" as const,
                yearlyData: getCityLulcData(city.slug),
              };

              const city2015 = getYearData(cityProfile, 2015);
              const city2025 = getYearData(cityProfile, 2025);
              const cityChange = getClassPercentage(city2025, CLASS_ID.BUILT_UP) - getClassPercentage(city2015, CLASS_ID.BUILT_UP);

              return (
                <Link key={city.slug} href={`/area/city/${city.slug}`} className="block h-full">
                  <Card className="h-full border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-zinc-500" />
                            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{city.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {city.isLakeAdjacent ? "Lakeside or lowland-sensitive area" : "Local planning profile"}
                          </p>
                        </div>
                        {city.isLakeAdjacent && <Badge variant="secondary">Lakeside</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">2025 built-up</p>
                          <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {getClassPercentage(city2025, CLASS_ID.BUILT_UP).toFixed(1)}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Change since 2015</p>
                          <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                            {cityChange >= 0 ? "+" : ""}{cityChange.toFixed(1)} pts
                          </p>
                        </div>
                      </div>
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
