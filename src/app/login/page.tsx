"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Layers, LoaderCircle, LogIn } from "lucide-react";
import { TOTAL_WATERSHED_AREA_HA } from "@/data/stats";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/"), 1200);
  };

  return (
    <div className="flex h-full min-h-screen">

      {/* ── Left panel — map + branding ──────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[58%] flex-col overflow-hidden">
        {/* Background map */}
        <Image
          src="/lulc_2025.png"
          alt="Laguna LULC 2025 map"
          fill
          className="object-cover"
          priority
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.92)_0%,rgba(8,47,73,0.85)_50%,rgba(19,78,74,0.80)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.14),transparent_35%)]" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/15 backdrop-blur-sm">
              <Layers className="h-5 w-5 text-cyan-300" />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-wide">
              Laguna LULC
            </span>
          </div>

          {/* Hero text */}
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/90">
              Urban Sprawl Analysis Platform
            </div>

            <h1 className="text-[2.75rem] font-bold leading-tight tracking-tight text-white">
              Laguna de Bay<br />Watershed
            </h1>

            <p className="mt-4 max-w-sm text-base leading-7 text-slate-300">
              Interactive land use and land cover classification and urban growth
              prediction for the Laguna de Bay watershed, Philippines.
            </p>

            {/* Stats */}
            <div className="mt-10 flex gap-8 border-t border-white/10 pt-8">
              {[
                { label: "Year Coverage", value: "2015 – 2025" },
                { label: "Total Area",    value: `${TOTAL_WATERSHED_AREA_HA.toLocaleString()} ha` },
                { label: "LULC Classes",  value: "5 Classes"   },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer attribution */}
          <p className="text-xs text-slate-600">
            Imagery: Sentinel-2 · Dynamic World · OpenStreetMap spatial drivers
          </p>
        </div>
      </div>

      {/* ── Right panel — login form ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">

        {/* Mobile logo (hidden on desktop) */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Layers className="h-5 w-5 text-slate-700" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Laguna LULC</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Access the watershed analysis dashboard.
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye    className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo note */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Demo platform — any credentials will work.
          </p>
        </div>
      </div>

    </div>
  );
}
