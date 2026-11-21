"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, Cpu, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GROWTH_PATTERNS,
  LANDSCAPE_METRICS,
  PATTERN_INTERVALS,
  MUNICIPAL_PATTERNS,
  getPattern,
  type GrowthPatternId,
} from "@/data/pattern-analysis";

// ── Mini SVG diagrams for each growth pattern ────────────────────────────────
// Grey squares = existing built-up cluster; colored squares = new cells.

function PatternDiagram({ id, color }: { id: GrowthPatternId; color: string }) {
  const existing: [number, number][] =
    id === "leapfrog"
      ? [[1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3]]
      : [[2, 1], [3, 1], [1, 2], [2, 2], [4, 2], [2, 3], [3, 3], [4, 3]];
  const added: [number, number][] =
    id === "infill"
      ? [[3, 2], [4, 1]]
      : id === "edge"
      ? [[5, 2], [5, 3], [4, 4]]
      : [[6, 5], [7, 5], [6, 6]];
  const cell = 16;
  return (
    <svg viewBox="0 0 144 128" className="h-20 w-24" aria-hidden>
      {existing.map(([x, y]) => (
        <rect
          key={`e${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell - 2}
          height={cell - 2}
          rx={2}
          className="fill-zinc-300 dark:fill-zinc-700"
        />
      ))}
      {added.map(([x, y]) => (
        <rect
          key={`a${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell - 2}
          height={cell - 2}
          rx={2}
          fill={color}
        />
      ))}
    </svg>
  );
}

// ── Metric mini chart ─────────────────────────────────────────────────────────

function MetricChart({
  title,
  unit,
  dataKey,
  color,
  note,
}: {
  title: string;
  unit: string;
  dataKey: string;
  color: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <LineChart data={LANDSCAPE_METRICS.filter((d) => !d.isForecast)} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={55} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString(), title]} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatternsPage() {
  const [intervalId, setIntervalId] = useState(PATTERN_INTERVALS[1].id);
  const interval = PATTERN_INTERVALS.find((i) => i.id === intervalId)!;
  const municipalPatterns = MUNICIPAL_PATTERNS;
  const sprawlShare = interval.shares.edge + interval.shares.leapfrog;

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in px-4 py-8 duration-500 md:px-8">
      <div className="mb-2 flex items-center gap-2">
        <ScanSearch className="h-6 w-6 text-indigo-500" />
        <h1 className="text-3xl font-bold tracking-tight">Spatial Pattern Recognition</h1>
      </div>
      <p className="max-w-3xl text-muted-foreground">
        How new built-up land attaches to the existing urban fabric. Each new
        patch of growth is classified as infill, edge expansion, or leapfrog
        development using the Landscape Expansion Index (LEI) — the standard
        way to recognize sprawl morphology from classified maps.
      </p>

      <Link
        href="/simulation"
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"
      >
        <Cpu className="h-4 w-4" />
        See the model place edge and leapfrog growth in real time
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Interval toggle */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {PATTERN_INTERVALS.map((i) => (
            <button
              key={i.id}
              onClick={() => setIntervalId(i.id)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                intervalId === i.id
                  ? "bg-indigo-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          +{interval.newBuiltUpHa.toLocaleString()} ha of new built-up land in
          this interval · {sprawlShare.toFixed(1)}% outward growth (edge +
          leapfrog)
        </p>
      </div>

      {/* Composition bar */}
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex h-9 w-full">
          {GROWTH_PATTERNS.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
              style={{
                width: `${interval.shares[p.id]}%`,
                backgroundColor: p.color,
              }}
            >
              {interval.shares[p.id] >= 10 && `${interval.shares[p.id].toFixed(1)}%`}
            </div>
          ))}
        </div>
      </div>

      {/* Pattern cards */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {GROWTH_PATTERNS.map((p) => {
          const share = interval.shares[p.id];
          const areaHa = (share / 100) * interval.newBuiltUpHa;
          return (
            <div
              key={p.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{p.leiRange}</p>
                </div>
                <PatternDiagram id={p.id} color={p.color} />
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: p.color }}>
                {share.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ {Math.round(areaHa).toLocaleString()} ha of new built-up
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <p className="mt-2 border-t border-zinc-100 pt-2 text-[11px] leading-relaxed text-muted-foreground dark:border-zinc-800">
                {p.planningNote}
              </p>
            </div>
          );
        })}
      </div>

      {/* Landscape metrics */}
      <h2 className="mt-10 text-xl font-bold tracking-tight">
        Landscape metrics of the built-up class
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Fragmentation statistics computed on the urban patches of each
        classified map. Fewer, larger patches with a growing largest-patch
        share indicate coalescence — scattered development merging into a
        contiguous urban footprint.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricChart
          title="Urban patches"
          unit="count"
          dataKey="patchCount"
          color="#6366f1"
          note="Falling patch count while total built-up grows means separate developments are merging."
        />
        <MetricChart
          title="Mean patch size"
          unit="hectares"
          dataKey="meanPatchHa"
          color="#0ea5e9"
          note="Average size of a contiguous built-up patch. Rising size signals consolidation."
        />
        <MetricChart
          title="Edge density"
          unit="m of urban edge per ha"
          dataKey="edgeDensityMPerHa"
          color="#f59e0b"
          note="Length of the urban–non-urban boundary. High values mean an irregular, fragmented frontier."
        />
        <MetricChart
          title="Largest patch index"
          unit="% of watershed"
          dataKey="largestPatchPct"
          color="#ef4444"
          note="Share of the watershed covered by the single largest urban patch — the metro core absorbing its surroundings."
        />
      </div>

      {/* Municipality table */}
      <h2 className="mt-10 text-xl font-bold tracking-tight">
        Dominant pattern by municipality
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Top municipalities by new built-up area 2015–2025 (real zonal
        statistics), with a heuristic dominant-pattern estimate from built-up
        saturation and growth intensity.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wider text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 font-medium">Municipality</th>
              <th className="px-4 py-3 font-medium">Province</th>
              <th className="px-4 py-3 text-right font-medium">New built-up</th>
              <th className="px-4 py-3 text-right font-medium">Infill</th>
              <th className="px-4 py-3 text-right font-medium">Edge</th>
              <th className="px-4 py-3 text-right font-medium">Leapfrog</th>
              <th className="px-4 py-3 font-medium">Dominant pattern</th>
            </tr>
          </thead>
          <tbody>
            {municipalPatterns.map((m) => {
              const p = getPattern(m.dominant);
              return (
                <tr
                  key={m.slug}
                  className="border-b border-zinc-100 bg-white last:border-0 dark:border-zinc-800/60 dark:bg-zinc-950"
                >
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`/area/city/${m.slug}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.province}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    +{(m.newBuiltHa / 100).toFixed(1)} km²
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.shares.infill.toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.shares.edge.toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.shares.leapfrog.toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Method explainer */}
      <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold tracking-tight">
          How patterns are recognized — the Landscape Expansion Index
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          For every patch of new built-up land between two classified maps, a
          buffer is drawn around the patch and the index measures how much of
          that buffer already touches existing urban land:
        </p>
        <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-center font-mono text-sm dark:bg-zinc-950">
          LEI = 100 × A<sub>urban</sub> / (A<sub>urban</sub> + A<sub>vacant</sub>)
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {GROWTH_PATTERNS.map((p) => (
            <div key={p.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
              <p className="font-mono text-xs" style={{ color: p.color }}>
                {p.leiRange}
              </p>
              <p className="mt-1 font-semibold">{p.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          A<sub>urban</sub> is the buffer area intersecting existing built-up
          land; A<sub>vacant</sub> the rest (Liu et al., 2010). The same
          classification runs on the simulated 2035 map so forecast morphology
          can be compared against the observed record.
        </p>
        <Link
          href="/forecast"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          See the 2035 forecast
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
