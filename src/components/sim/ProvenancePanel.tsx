"use client";

/**
 * Where the layers under the simulation came from.
 *
 * Carried over from the old "How It Works" page, which this simulation
 * replaced. The wizard and its scripted terminal are gone - they animated a
 * pipeline run rather than showing one - but the provenance was the part of
 * that page worth keeping, and a panel will reasonably ask where the maps and
 * the accuracy figures came from before trusting anything the model does with
 * them. Collapsed by default so it never competes with the simulation itself.
 */
import { useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Globe,
  LayoutGrid,
  MapPin,
  Satellite,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassColor } from "@/data/constants";
import { GENERATED_WATERSHED_LULC_DATA } from "@/data/generated/watershed-stats.generated";
import {
  GENERATED_MUNICIPALITY_COUNT,
  GENERATED_PIPELINE_YEARS,
  GENERATED_PROVINCE_COUNT,
} from "@/data/generated/pipeline-summary.generated";

const CLASS_DISPLAY: Record<string, string> = {
  "Built-up": "Built-up",
  Agriculture: "Agriculture",
  Forest_Vegetation: "Forest / Veg.",
  Water: "Water",
  Open_Land: "Open Land",
};

const YEAR_INPUTS = GENERATED_PIPELINE_YEARS.map((entry) => {
  const stats = GENERATED_WATERSHED_LULC_DATA.find((y) => y.year === entry.year);
  return {
    year: entry.year,
    sensor: entry.sensor,
    resolution: `${entry.resolutionM}m`,
    bands: entry.bands,
    file: entry.stackFile,
    image: `/lulc_${entry.year}.png`,
    overallAccuracy: entry.overallAccuracy,
    kappa: entry.kappa,
    trainingSamples: entry.trainingSamples,
    testSamples: entry.testSamples,
    classes: (stats?.classes ?? []).map((cls) => ({
      name: CLASS_DISPLAY[cls.className] ?? cls.className,
      pct: cls.percentage,
      color: getClassColor(cls.classId),
    })),
  };
});

// s03c_classify4_obia.py draws its training labels from Dynamic World alone
// (dwp_<year>.tif, confidence > 0.75). WorldCover and CGLS-LC100 appeared on
// the old page from an earlier design and are not read by the pipeline.
const REFERENCE_SOURCES = [
  {
    label: "Google Dynamic World",
    icon: Satellite,
    meta: "10 m per-class probabilities",
    desc: "Sole source of training labels. Only cells the classifier scores above 0.75 confidence for a class are sampled, giving 160,000 labelled cells per year.",
  },
  {
    label: "Human-labelled validation set",
    icon: LayoutGrid,
    meta: "381-395 stratified points per year",
    desc: "Interpreted independently against Esri Wayback high-resolution imagery. Held entirely out of training and used only for the accuracy assessment.",
  },
  {
    label: "PSA 2023 boundaries",
    icon: MapPin,
    meta: `${GENERATED_MUNICIPALITY_COUNT} municipalities · ${GENERATED_PROVINCE_COUNT} provinces`,
    desc: "Official administrative boundaries clipped to the watershed for zonal statistics.",
  },
  {
    label: "Laguna de Bay basin",
    icon: Waves,
    meta: "LLDA watershed boundary",
    desc: "Basin polygon used to clip imagery, maps, and statistics.",
  },
];

export default function ProvenancePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
        <span className="text-sm font-semibold">Where these layers come from</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Sentinel-2, Dynamic World labels, and the accuracy of each year&apos;s map
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-6 border-t border-border p-4">
          <div>
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Observed years fed to the classifier
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              {YEAR_INPUTS.map((item) => (
                <div
                  key={item.year}
                  className="overflow-hidden rounded-xl border border-border bg-background"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-muted">
                    <Image
                      src={item.image}
                      alt={`Classified land cover, ${item.year}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-0.5 text-lg font-bold text-slate-950">
                      {item.year}
                    </span>
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
                      {item.resolution} &middot; {item.bands} bands
                    </span>
                  </div>

                  <div className="space-y-2 p-3">
                    <p className="font-mono text-[10px] text-muted-foreground">{item.file}</p>
                    <div className="flex items-baseline gap-3 text-[11px]">
                      <span className="text-muted-foreground">accuracy</span>
                      <span className="font-semibold tabular-nums">
                        {item.overallAccuracy.toFixed(2)}%
                      </span>
                      <span className="text-muted-foreground">kappa</span>
                      <span className="font-semibold tabular-nums">
                        {item.kappa.toFixed(3)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {item.trainingSamples.toLocaleString()} training cells,{" "}
                      {item.testSamples} independent check points
                    </p>
                    <div className="space-y-1 pt-1">
                      {item.classes.map((cls) => (
                        <div key={cls.name} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="flex-1 text-[11px] text-muted-foreground">
                            {cls.name}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums">
                            {cls.pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Reference data
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Globe className="h-3 w-3" />
                Open datasets
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {REFERENCE_SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <div
                    key={source.label}
                    className="rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h5 className="mt-2 text-xs font-semibold">{source.label}</h5>
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      {source.meta}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      {source.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] leading-5 text-muted-foreground">
            The 17-band stack the classifier reads per year is B2, B3, B4, B8, B11, B12,
            NDVI, NDBI, MNDWI, NDWI, BSI, NDVI_std3, NDBI_std3, NDVI_mean5, NDBI_mean5,
            elevation and slope. That classifier produces the land-cover maps; the eleven
            drivers in Act 1 belong to the separate transition model that decides where
            built-up land spreads next.
          </p>
        </div>
      )}
    </div>
  );
}
