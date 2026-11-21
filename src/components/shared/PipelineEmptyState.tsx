import Link from "next/link";
import { ArrowRight, DatabaseZap } from "lucide-react";

type Props = {
  description: string;
  preview: string[];
};

export default function PipelineEmptyState({ description, preview }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">

        {/* Dark gradient top section */}
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#082f49_55%,#134e4a_100%)] px-8 py-10 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.15),transparent_40%)]" />

          <div className="relative">
            {/* Icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <DatabaseZap className="h-7 w-7 text-cyan-300" />
            </div>

            {/* Text */}
            <h2 className="mt-5 text-xl font-bold tracking-tight text-white">
              No data processed yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {description}
            </p>

            {/* CTA */}
            <Link
              href="/simulation"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              See the Model Run
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Preview list */}
        <div className="px-8 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            What you&apos;ll see after running
          </p>
          <ul className="mt-4 space-y-3">
            {preview.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <span className="text-sm leading-6 text-slate-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
