"use client";

import Link from "next/link";
import { CLASS_ID } from "@/data/constants";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, Map, MapPin, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAreaData } from "@/hooks/useAreaData";
import { useLulcData } from "@/hooks/useLulcData";
import { usePipelineReady } from "@/hooks/usePipelineReady";
import PipelineEmptyState from "@/components/shared/PipelineEmptyState";
import AreaActionPlan from "@/components/area/AreaActionPlan";
import AreaMetricGrid from "@/components/area/AreaMetricGrid";
import AreaNarrativePanel from "@/components/area/AreaNarrativePanel";
import AreaValidationPanel from "@/components/area/AreaValidationPanel";
import { getCityLulcData, getProvinceLulcData } from "@/data/stats";
import { getAreaNarrative, getComparisonMetrics, getValidationStory, getYearData, getClassPercentage } from "@/lib/area-insights";

export default function AreaBrowser() {
  const { provinces, municipalities } = useAreaData();
  const { profile } = useLulcData("watershed");
  const { isReady } = usePipelineReady();
  const [query, setQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const validationStory = useMemo(() => getValidationStory(2025), []);

  const watershedNarrative = useMemo(() => {
    if (!profile) return null;
    return getAreaNarrative(profile, {
      areaName: "Laguna de Bay Watershed",
      areaType: "watershed",
      municipalityCount: municipalities.length,
    });
  }, [municipalities.length, profile]);

  const topMetrics = useMemo(() => {
    if (!profile) return [];

    return [
      ...getComparisonMetrics(profile),
      {
        label: "Coverage",
        value: `${municipalities.length} LGUs`,
        note: `Grouped into ${provinces.length} province-level views for browsing and planning.`,
      },
      {
        label: "Shoreline-sensitive LGUs",
        value: `${municipalities.filter((city) => city.isLakeAdjacent).length}`,
        note: "These places need stronger runoff and setback controls because they directly influence lake health.",
      },
    ];
  }, [municipalities, profile, provinces.length]);

  const provinceCards = useMemo(
    () =>
      provinces.map((province) => {
        const provinceProfile = {
          slug: province.slug,
          name: province.name,
          type: "province" as const,
          yearlyData: getProvinceLulcData(province.slug),
        };

        const data2015 = getYearData(provinceProfile, 2015);
        const data2025 = getYearData(provinceProfile, 2025);

        return {
          province,
          built2025: getClassPercentage(data2025, CLASS_ID.BUILT_UP),
          builtChange: getClassPercentage(data2025, CLASS_ID.BUILT_UP) - getClassPercentage(data2015, CLASS_ID.BUILT_UP),
          narrative: getAreaNarrative(provinceProfile, {
            areaName: province.name,
            areaType: "province",
            municipalityCount: province.municipalityCount,
          }),
        };
      }),
    [provinces]
  );

  const cityCards = useMemo(
    () =>
      municipalities.map((city) => {
        const cityProfile = {
          slug: city.slug,
          name: city.name,
          type: "city" as const,
          yearlyData: getCityLulcData(city.slug),
        };

        const data2015 = getYearData(cityProfile, 2015);
        const data2025 = getYearData(cityProfile, 2025);

        return {
          city,
          built2025: getClassPercentage(data2025, CLASS_ID.BUILT_UP),
          builtChange: getClassPercentage(data2025, CLASS_ID.BUILT_UP) - getClassPercentage(data2015, CLASS_ID.BUILT_UP),
          narrative: getAreaNarrative(cityProfile, {
            areaName: city.name,
            areaType: "city",
            provinceName: city.province,
            isLakeAdjacent: city.isLakeAdjacent,
          }),
        };
      }),
    [municipalities]
  );

  const filteredCities = useMemo(() => {
    return cityCards.filter(({ city }) => {
      const matchesProvince = selectedProvince === "all" || city.provinceSlug === selectedProvince;
      const matchesQuery =
        deferredQuery.length === 0 ||
        city.name.toLowerCase().includes(deferredQuery) ||
        city.province.toLowerCase().includes(deferredQuery);

      return matchesProvince && matchesQuery;
    });
  }, [cityCards, deferredQuery, selectedProvince]);

  const groupedCities = useMemo(
    () =>
      provinces
        .map((province) => ({
          province,
          cities: filteredCities.filter(({ city }) => city.provinceSlug === province.slug),
        }))
        .filter((group) => group.cities.length > 0),
    [filteredCities, provinces]
  );

  if (isReady === null) return null;
  if (!isReady) return (
    <PipelineEmptyState
      description="Run the pipeline simulation to generate land cover breakdowns, trend narratives, and planning metrics for all areas."
      preview={[
        "LULC charts for every municipality and province",
        "Built-up growth trends from 2015 to 2025",
        "Validation scores and local action plans",
      ]}
    />
  );

  if (!profile || !watershedNarrative) return null;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_45%,_#f8fafc_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.25),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(154,52,18,0.2),_transparent_28%),linear-gradient(180deg,_#09090b_0%,_#09090b_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/92 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/70 dark:bg-zinc-950/85 dark:shadow-black/20">
          <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 xl:grid-cols-[1.4fr_0.9fr]">
            <div>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                Areas, Planning, and Validation
              </Badge>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-5xl">
                A clearer view of where growth is happening, what it could affect, and what local planners can do next.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                This section turns the land-cover model into plain-language planning views for the whole watershed, for each province-level area, and for each covered city or municipality. The goal is not to overwhelm people with charts. It is to explain what is changing, why it matters, and which actions are worth doing early.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/area/watershed"
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Full Watershed Suggestions
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Open Interactive Map
                </Link>
                <Link
                  href="/simulation"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Watch the Algorithm Run
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <div className="flex items-center gap-3 text-zinc-950 dark:text-zinc-50">
                  <Map className="h-5 w-5" />
                  <p className="font-semibold">What you can browse here</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Watershed-wide trends, province-level summaries, city and municipality profiles, action-plan ideas, and an accuracy panel that explains kappa and overall validation in simple terms.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-zinc-200/80 bg-zinc-50/85 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                <div className="flex items-center gap-3 text-zinc-950 dark:text-zinc-50">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-semibold">What the numbers mean</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  The stats come from zonal statistics computed over the classified satellite maps, clipped to each LGU&apos;s share of the watershed. The policy suggestions are planning guidance designed to help explain risk, priorities, and likely interventions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <AreaMetricGrid items={topMetrics} />

        <AreaNarrativePanel narrative={watershedNarrative} />

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
              Priority Moves
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Basin-wide actions worth starting now
            </h2>
          </div>
          <AreaActionPlan actions={watershedNarrative.actions} />
        </section>

        <AreaValidationPanel story={validationStory} />

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
              Province Views
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Where the strongest pressure is showing up
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {provinceCards.map(({ province, built2025, builtChange, narrative }) => (
              <Link key={province.slug} href={`/area/province/${province.slug}`} className="block h-full">
                <Card className="h-full border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{province.municipalityCount} LGUs</Badge>
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                        {narrative.toneLabel}
                      </span>
                    </div>
                    <CardTitle className="text-2xl tracking-tight">{province.name}</CardTitle>
                    <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{province.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/65">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">2025 built-up</p>
                        <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{built2025.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/65">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Change since 2015</p>
                        <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{builtChange >= 0 ? "+" : ""}{builtChange.toFixed(1)} pts</p>
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{narrative.summary}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">
                City and Municipality Browser
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Browse local profiles, suggestions, and mitigation ideas
              </h2>
            </div>
            <div className="flex w-full max-w-2xl flex-col gap-3 lg:items-end">
              <div className="relative w-full">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by city, municipality, or province..."
                  className="w-full rounded-full border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="All areas" active={selectedProvince === "all"} onClick={() => setSelectedProvince("all")} />
                {provinces.map((province) => (
                  <FilterChip
                    key={province.slug}
                    label={province.name}
                    active={selectedProvince === province.slug}
                    onClick={() => setSelectedProvince(province.slug)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {groupedCities.map(({ province, cities }) => (
              <div key={province.slug} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{province.name}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{cities.length} results in this view</p>
                  </div>
                  <Link
                    href={`/area/province/${province.slug}`}
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Open province page
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cities.map(({ city, built2025, builtChange, narrative }) => (
                    <Link key={city.slug} href={`/area/city/${city.slug}`} className="block h-full">
                      <Card className="h-full border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-200/40 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-black/20">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-zinc-500" />
                                <h4 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{city.name}</h4>
                              </div>
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{city.province}</p>
                            </div>
                            {city.isLakeAdjacent && <Badge variant="secondary">Lakeside</Badge>}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">2025 built-up</p>
                              <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{built2025.toFixed(1)}%</p>
                            </div>
                            <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900/65">
                              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Change since 2015</p>
                              <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">{builtChange >= 0 ? "+" : ""}{builtChange.toFixed(1)} pts</p>
                            </div>
                          </div>

                          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{narrative.summary}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
          : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}
