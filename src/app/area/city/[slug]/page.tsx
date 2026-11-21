"use client";

import { Suspense } from "react";
import { CLASS_ID } from "@/data/constants";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, ArrowRight, Building2, Droplets } from "lucide-react";
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
import { getAreaNarrative, getClassPercentage, getComparisonMetrics, getNetChange, getValidationStory, getYearData } from "@/lib/area-insights";

export default function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <CityContent params={params} />
    </Suspense>
  );
}

function CityContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { municipalities } = useAreaData();
  const city = municipalities.find((entry) => entry.slug === slug);
  const { profile } = useLulcData("city", slug);
  const { isReady } = usePipelineReady();

  if (!city || !profile) {
    return <div className="p-8 text-sm text-zinc-500">City or municipality not found.</div>;
  }

  if (isReady === null) return null;
  if (!isReady) return (
    <PipelineEmptyState
      description="Run the pipeline simulation to generate land cover data and planning insights for this municipality."
      preview={[
        "LULC trend charts for 2015, 2020, and 2025",
        "Built-up and agriculture change metrics",
        "Validation score and local action plan",
      ]}
    />
  );

  const data2015 = getYearData(profile, 2015);
  const data2025 = getYearData(profile, 2025);
  const builtChange = getClassPercentage(data2025, CLASS_ID.BUILT_UP) - getClassPercentage(data2015, CLASS_ID.BUILT_UP);
  const narrative = getAreaNarrative(profile, {
    areaName: city.name,
    areaType: "city",
    provinceName: city.province,
    isLakeAdjacent: city.isLakeAdjacent,
  });
  const validationStory = getValidationStory(2025);
  const metrics = [
    ...getComparisonMetrics(profile),
    {
      label: "Province",
      value: city.province,
      note: "Use the province page to compare this place against neighboring local areas.",
    },
    {
      label: "Area within watershed",
      value: `${Math.round(city.areaHa).toLocaleString()} ha`,
      note: "This LGU's real land area inside the Laguna de Bay watershed boundary.",
    },
  ];

  const changeCards = [
    {
      title: "Built-up change since 2015",
      value: `${getNetChange(profile, CLASS_ID.BUILT_UP, 2015, 2025).toFixed(1)} pts`,
      note: "Higher values mean more land shifted into urban or built-up use over the observed decade.",
    },
    {
      title: "Agriculture shift since 2015",
      value: `${getNetChange(profile, CLASS_ID.AGRICULTURE, 2015, 2025).toFixed(1)} pts`,
      note: "This helps show whether productive or open land is being squeezed by expansion.",
    },
    {
      title: "Forest shift since 2015",
      value: `${getNetChange(profile, CLASS_ID.FOREST, 2015, 2025).toFixed(1)} pts`,
      note: "Negative values mean green cover shrank over the observed decade.",
    },
  ];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_#fafaf9_0%,_#ffffff_38%,_#f8fafc_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,_#09090b_0%,_#09090b_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href={`/area/province/${city.provinceSlug}`}
            className="inline-flex items-center gap-2 hover:text-zinc-950 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {city.province}
          </Link>
          <span>/</span>
          <span>{city.name}</span>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/95 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/70 dark:bg-zinc-950/85 dark:shadow-black/20">
          <div className="grid gap-6 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.3fr_0.8fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{city.province}</Badge>
                {city.isLakeAdjacent && <Badge variant="secondary">Lakeside sensitivity</Badge>}
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
                {city.name}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                This local profile turns the classified land-cover trend into an easier planning readout for non-technical users: what is already built over, what changed over the decade, and what local actions could reduce avoidable risk.
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
                  <p className="font-semibold">Local growth snapshot</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {data2025?.classes.find((entry) => entry.classId === CLASS_ID.BUILT_UP)?.percentage.toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Built-up share in 2025. This is the simplest starting point for understanding local development pressure.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
                  <Droplets className="h-5 w-5" />
                  <p className="font-semibold">Change since 2015</p>
                </div>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {builtChange >= 0 ? "+" : ""}{builtChange.toFixed(1)} pts
                </p>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  How much the built-up share grew here over the observed decade.
                </p>
              </div>
            </div>
          </div>
        </section>

        <AreaMetricGrid items={metrics} />

        <AreaNarrativePanel narrative={narrative} />

        {city.isLakeAdjacent && (
          <Card className="border-blue-200/80 bg-blue-50/70 shadow-sm shadow-sky-200/30 dark:border-blue-900/60 dark:bg-blue-950/20 dark:shadow-black/20">
            <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
                  Lakeside note
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Runoff management matters more here than in inland areas
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                  Because {city.name} touches the lake or closely connected lowlands, even small increases in paved surfaces can show up as faster runoff, dirtier edge water, and less room for flood storage. This is why shoreline setbacks, vegetated edges, and drainage controls should appear early in the local response list.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-zinc-200/80 bg-white/95 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="text-2xl tracking-tight">Current land mix</CardTitle>
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                This shows what the area is mostly made of in the current 2025 view.
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
                Compares today&apos;s 2025 composition against the classified 2015 baseline.
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
              Change Readout
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              What changed and why it matters
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
              Suggested Local Response
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Practical actions for {city.name}
            </h2>
          </div>
          <AreaActionPlan actions={narrative.actions} />
        </section>

        <AreaValidationPanel story={validationStory} />
      </div>
    </div>
  );
}
