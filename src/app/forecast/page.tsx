"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  FORECAST_SCENARIOS,
  FORECAST_HORIZONS,
  AVOIDED_SHORELAND_HA,
  SHORELAND_BUFFER_M,
  DRIVER_IMPORTANCE,
  TRANSITION_BENCHMARK,
  VALIDATION_VARIANTS,
  PRODUCT_AGREEMENT,
} from "@/data/generated/analysis.generated";
import { EXTENDED_HORIZON_YEARS } from "@/data/constants";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Cpu, TrendingUp, CheckCircle2, FlaskConical } from "lucide-react";

const WatershedMap = dynamic(() => import("@/components/map/WatershedMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  ),
});

export default function ForecastPage() {
  const [scenario, setScenario] = useState(FORECAST_SCENARIOS[0].id);
  const [horizon, setHorizon] = useState<string>("2035");
  const active = FORECAST_SCENARIOS.find((s) => s.id === scenario)!;
  const h = active.horizons[horizon];
  const isExtended = EXTENDED_HORIZON_YEARS.map(String).includes(horizon);

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in px-4 py-8 duration-500 md:px-8">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-indigo-500" />
        <h1 className="text-3xl font-bold tracking-tight">
          {horizon} Urban Sprawl Forecast
        </h1>
      </div>
      <p className="max-w-3xl text-muted-foreground">
        Hybrid Cellular Automata &ndash; Machine Learning projection of built-up
        expansion in the Laguna de Bay watershed, with three planning scenarios.
      </p>

      <Link
        href="/simulation"
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"
      >
        <Cpu className="h-4 w-4" />
        Watch the CA-ML model produce this forecast, step by step
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Horizon selector */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Horizon
        </span>
        {FORECAST_HORIZONS.map((y: string) => (
          <button
            key={y}
            onClick={() => setHorizon(y)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              horizon === y
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            {y}
            {EXTENDED_HORIZON_YEARS.map(String).includes(y) && (
              <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                extended
              </span>
            )}
          </button>
        ))}
      </div>

      {isExtended && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Extended scenario</p>
            <p className="text-muted-foreground">
              {horizon} is three cellular-automata steps beyond the last observed
              year. Population, night-time lights and road distances are held at
              their last observed values throughout, so uncertainty compounds.
              Read it as a direction of travel, not a dated prediction.
            </p>
          </div>
        </div>
      )}

      {/* Scenario selector */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {FORECAST_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              scenario === s.id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <p className="text-sm font-semibold">{s.name}</p>
            <p className="mt-1 text-2xl font-bold">
              +{(s.horizons[horizon].netGrowthHa / 100).toFixed(0)} km²
            </p>
            <p className="text-xs text-muted-foreground">
              built-up growth · +{s.horizons[horizon].growthPct}%
            </p>
          </button>
        ))}
      </div>

      {/* Why two scenarios read the same total */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-semibold text-foreground">
          Business-as-usual and Environmental protection show the same total.
        </span>{" "}
        That is the model working, not a fault. Demand is held constant across
        scenarios because protecting land redirects development rather than
        preventing it &mdash; the same growth has to go somewhere. Protection&rsquo;s
        result is spatial: the {SHORELAND_BUFFER_M} m shoreland buffer keeps{" "}
        <span className="font-semibold text-foreground">
          {(AVOIDED_SHORELAND_HA / 100).toFixed(1)} km²
        </span>{" "}
        of riparian and lakeshore land out of development that the
        business-as-usual run builds on, pushing that growth inland instead.
        Compare the two probability maps rather than the two totals.
      </div>

      {/* Map + scenario detail */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="h-[420px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 lg:col-span-2">
          <WatershedMap
            selectedYear={2025}
            selectedArea={null}
            onSelectArea={() => {}}
            activeLayers={["forecast", "peza"]}
            forecastOverlay={`/prob_${horizon}_${scenario}.png`}
            showLulc={false}
          />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            {active.name}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {active.description}
          </p>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <dt className="text-sm text-muted-foreground">Built-up {horizon}</dt>
              <dd className="text-sm font-semibold">
                {(h.builtUpHa / 100).toFixed(0)} km²
              </dd>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <dt className="text-sm text-muted-foreground">Net growth</dt>
              <dd className="text-sm font-semibold">
                +{(h.netGrowthHa / 100).toFixed(0)} km²
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Growth rate</dt>
              <dd className="text-sm font-semibold">+{h.growthPct}%</dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Red intensity is the share of 25 Monte Carlo runs in which the cell
            becomes built-up by {horizon} under the {active.name.toLowerCase()} scenario.
          </p>
        </div>
      </div>

      {/* Real: drivers + benchmark */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold">Spatial driver importance</h2>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              REAL
            </span>
          </div>
          <div className="space-y-2">
            {DRIVER_IMPORTANCE.slice(0, 7).map((d) => {
              const max = DRIVER_IMPORTANCE[0].importance;
              return (
                <div key={d.feature} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 text-xs text-muted-foreground">
                    {d.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(d.importance / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                    {d.importance.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold">Transition model benchmark</h2>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              REAL
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {TRANSITION_BENCHMARK.map((m) => (
                <tr key={m.model} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="py-2">
                    {m.model}
                    {m.selected && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        selected
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {m.auc.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-muted-foreground">
            AUC under 5&nbsp;km spatial-block cross-validation.
          </p>
        </div>
      </div>

      {/* Real: validation */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-bold">Internal validation (simulate 2025 from 2020)</h2>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            REAL
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VALIDATION_VARIANTS.map((v) => (
            <div key={v.id} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="text-sm font-semibold">{v.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{v.fom.toFixed(3)}</span>
                <span className="text-xs text-muted-foreground">Figure of Merit</span>
                {v.fomRandomBaseline && (
                  <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {(v.fom / v.fomRandomBaseline).toFixed(1)}× random
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>Demand: {v.demandKm2} km²</span>
                <span>Quantity dis.: {v.quantityDisagreement.toFixed(3)}</span>
              </div>
              {v.fomMultiRes && (
                <div className="mt-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    FoM by resolution
                  </p>
                  <div className="flex items-end gap-1">
                    {v.fomMultiRes.map((r) => (
                      <div key={r.resolution} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-indigo-400"
                          style={{ height: `${r.fom * 300}px` }}
                        />
                        <span className="text-[9px] text-muted-foreground">{r.resolution}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Independent product agreement
          </p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_AGREEMENT.map((p) => (
              <span
                key={p.product}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800"
              >
                {p.product}: <b>{p.overallAgreement}%</b>
                {p.builtF1 != null && (
                  <span className="text-muted-foreground"> · built F1 {p.builtF1}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
