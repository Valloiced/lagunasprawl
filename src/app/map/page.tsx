"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import YearSlider from "@/components/map/YearSlider";
import MapLegend from "@/components/map/MapLegend";
import { useMemo } from "react";
import { getWatershedLulcData } from "@/data/stats";
import MapDonutChart from "@/components/map/MapDonutChart";
import { ArrowRight, Search, MapPin, X, ChevronDown } from "lucide-react";
import { LulcYearData, Year } from "@/data/types";
import { municipalities, provinces } from "@/data/areas";
import { usePipelineReady } from "@/hooks/usePipelineReady";
import PipelineEmptyState from "@/components/shared/PipelineEmptyState";
import { SPATIAL_LAYERS } from "@/data/generated/analysis.generated";
import { Layers } from "lucide-react";

// Must be loaded dynamically due to window usage in Leaflet
const WatershedMap = dynamic(() => import("@/components/map/WatershedMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 animate-pulse">
      <p className="text-muted-foreground font-medium flex items-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"/> Loading Map Engine...
      </p>
    </div>
  ),
});

function getLulcInterpretation(yearData: LulcYearData | undefined, year: Year): { headline: string; points: string[] } {
  if (!yearData) return { headline: "No data", points: [] };

  const get = (id: number) => yearData.classes.find((c) => c.classId === id)?.percentage ?? 0;
  const builtUp = get(2);
  const agri = get(4);
  const forest = get(3);
  const water = get(1);

  const headline = yearData.isPredicted
    ? `CA-ML projected land cover for ${year}`
    : `Classified land cover for ${year}`;

  const points: string[] = [];

  points.push(
    `Built-up (${builtUp.toFixed(1)}%): ${
      builtUp >= 40
        ? "High urban density — more than 4 in 10 hectares are roads, buildings, or paved surfaces."
        : builtUp >= 20
          ? "Moderate urbanization — roughly 1 in 5 hectares is built up."
          : "Low urban density — most land is still open, farmed, or green."
    }`
  );

  if (agri > 1) {
    points.push(
      `Agriculture (${agri.toFixed(1)}%): ${
        agri >= 20
          ? "Farmland is a major land use and worth actively protecting."
          : agri >= 10
            ? "Some farmland remains — at risk of conversion without protection."
            : "Very little farmland left in this view."
      }`
    );
  }

  if (forest > 0) {
    points.push(
      `Forest & vegetation (${forest.toFixed(1)}%): ${
        forest >= 30
          ? "Good tree cover — helps cool the area, slow runoff, and support biodiversity."
          : forest >= 15
            ? "Moderate forest cover — monitor closely to prevent further loss."
            : "Critically low — below the 15% minimum for healthy watershed function. Reforestation is urgent."
      }`
    );
  }

  if (water > 1) {
    points.push(`Water (${water.toFixed(1)}%): Covers Laguna Lake and connected rivers or flood-prone lowlands.`);
  }

  return { headline, points };
}

export default function MapPage() {
  const [selectedYear, setSelectedYear] = useState<Year>(2025);
  const [selectedArea, setSelectedArea] = useState<{ type: "province" | "city"; slug: string } | null>(null);
  const [showLulcInterpretation, setShowLulcInterpretation] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>(
    SPATIAL_LAYERS.filter((l) => l.defaultOn).map((l) => l.id)
  );
  const [showLulc, setShowLulc] = useState(true);
  const toggleLayer = (id: string) =>
    setActiveLayers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSelectArea = (type: "province" | "city", slug: string) => {
    setSelectedArea({ type, slug });
  };

  const [searchQuery, setSearchQuery] = useState("");

  const searchItems = useMemo(() => {
    const provinceItems = provinces.map(p => ({ ...p, type: 'province' as const }));
    const municipalityItems = municipalities.map(m => ({ ...m, type: 'city' as const }));
    const items = [...provinceItems, ...municipalityItems];
    
    if (!searchQuery) return [];
    
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(searchQuery);

    return items.filter(i => 
      normalize(i.name).includes(normalizedQuery)
    ).slice(0, 5);
  }, [searchQuery]);

  const { isReady } = usePipelineReady();
  const watershedData = useMemo(() => getWatershedLulcData(), []);
  const yearData = watershedData.find(d => d.year === selectedYear);
  const selectedAreaInfo = useMemo(() => {
    if (!selectedArea) return null;

    if (selectedArea.type === "city") {
      const city = municipalities.find((item) => item.slug === selectedArea.slug);
      if (!city) return null;

      return {
        name: city.name,
        subtitle: `City in ${city.province}`,
        href: `/area/city/${city.slug}?year=${selectedYear}`,
      };
    }

    const province = provinces.find((item) => item.slug === selectedArea.slug);
    if (!province) return null;

    return {
      name: province.name,
      subtitle: "Province view",
      href: `/area/province/${province.slug}?year=${selectedYear}`,
    };
  }, [selectedArea]);

  // Zoom and boundary are both handled inside WatershedMap from selectedArea,
  // now that municipalities.geojson carries the same slugs as areas.generated.
  // Passing `focus` or `highlightSlug` as well adds a second animation and a
  // duplicate layer against the same map, which Leaflet throws on mid-flight.

  if (isReady === null) return null;
  if (!isReady) return (
    <PipelineEmptyState
      description="Run the pipeline simulation to unlock the interactive map with the classified LULC year overlays and the year slider."
      preview={[
        "Interactive LULC overlays for 2015, 2020, and 2025",
        "CA-ML projected 2030 and 2035 forecast years",
        "Year slider for side-by-side time comparison",
        "Area-level detail panel on hover and click",
      ]}
    />
  );

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col animate-in fade-in duration-500 md:h-full md:min-h-0">
      {/* Main Map Area */}
      <div className="relative flex-1 min-h-0 w-full bg-zinc-100 dark:bg-zinc-950">
        <WatershedMap
          selectedYear={selectedYear}
          selectedArea={selectedArea}
          onSelectArea={handleSelectArea}
          activeLayers={activeLayers}
          showLulc={showLulc}
        />

        {/* Left control column. Search and layers used to be absolutely
            positioned against different parents at fixed offsets, so they
            overlapped whenever either grew. One scrollable stack instead. */}
        <div className="pointer-events-none absolute left-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto pb-2 [scrollbar-width:thin]">
        <div className="pointer-events-auto shrink-0 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <h1 className="font-bold text-lg leading-none tracking-tight">Interactive Map</h1>
          <p className="text-xs text-muted-foreground mt-1">Explore Laguna de Bay watershed</p>
        
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Filter Area</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search city or province..."
                  className="w-full pl-9 pr-8 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {selectedArea && (
                  <button 
                    onClick={() => {
                      setSelectedArea(null);
                      setSearchQuery("");
                    }}
                    className="absolute right-2.5 top-2.5"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {searchItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {searchItems.map((item) => (
                    <button
                      key={item.slug}
                      onClick={() => {
                        handleSelectArea(item.type, item.slug);
                        setSearchQuery(""); // Clear immediately
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <MapPin className={`h-4 w-4 ${item.type === 'province' ? 'text-indigo-500' : 'text-emerald-500'}`} />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {item.type === 'province' ? 'Province' : `City in ${'province' in item ? item.province : ''}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href={`/area/watershed?year=${selectedYear}`}
              className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              View Watershed Overview
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          </div>

          <div className="pointer-events-auto shrink-0 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold tracking-tight">Data Layers</h2>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-1.5">
            <span className="flex items-center gap-2 text-xs font-medium">
              <span className="h-3 w-3 rounded-sm bg-gradient-to-r from-emerald-500 via-orange-400 to-red-500" />
              LULC classification
            </span>
            <input
              type="checkbox"
              checked={showLulc}
              onChange={() => setShowLulc((v) => !v)}
              className="h-4 w-4 accent-indigo-600"
            />
          </label>
          <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
          <div className="flex flex-col gap-0.5">
            {SPATIAL_LAYERS.map((l) => (
              <label
                key={l.id}
                className="flex cursor-pointer items-start justify-between gap-2 rounded-lg px-1 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                title={l.description}
              >
                <span className="flex items-start gap-2">
                  <span
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="flex flex-col">
                    <span className="text-xs font-medium leading-tight">{l.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground line-clamp-2">
                      {l.description}
                    </span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={activeLayers.includes(l.id)}
                  onChange={() => toggleLayer(l.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
                />
              </label>
            ))}
            </div>
          </div>
        </div>

        {/* LULC Donut Chart (Top Right) */}
        <div className="absolute top-4 right-4 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-3 rounded-2xl shadow-xl shadow-black/5 border border-zinc-200/50 dark:border-zinc-800/50 w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto pointer-events-auto">
          <button
            className="flex items-center justify-between w-full mb-2 px-1 group"
            onClick={() => setShowLulcInterpretation((v) => !v)}
            title="Click to see plain-language interpretation"
          >
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              LULC Distribution
            </h3>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showLulcInterpretation ? "rotate-180" : ""}`}
            />
          </button>
          <div className="w-full">
            <MapDonutChart data={yearData} baseline={watershedData[0]} />
          </div>
          {showLulcInterpretation && (() => {
            const interp = getLulcInterpretation(yearData, selectedYear);
            return (
              <div className="mt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {interp.headline}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {interp.points.map((point, i) => (
                    <li key={i} className="text-[10px] leading-[1.5] text-zinc-600 dark:text-zinc-300">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
        
        {/* Bottom controls */}
        <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <YearSlider selectedYear={selectedYear} onChange={setSelectedYear} />
          </div>
        </div>

        {selectedAreaInfo && (
          <div className="absolute bottom-24 left-4 z-10 max-w-[calc(100vw-2rem)] pointer-events-none md:bottom-6 md:max-w-sm">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-xl shadow-black/5 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Selected Area
                </span>
                <span className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {selectedAreaInfo.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {selectedAreaInfo.subtitle}
                </span>
              </div>

              <Link
                href={selectedAreaInfo.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                View Suggestions
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 right-4 z-10 pointer-events-none">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
