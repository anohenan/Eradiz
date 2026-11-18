import { Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import type { GenerationStepState } from "../types/eradiz";

interface GenerationProgressProps {
  steps: GenerationStepState[];
  cutoutProgress: number;
}

export function GenerationProgress({
  steps,
  cutoutProgress,
}: GenerationProgressProps) {
  return (
    <section
      aria-live="polite"
      className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Préparation de votre kit vendeur
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Traitement optimisé en cours — votre crédit ne sera déduit qu’en cas de succès.
            </p>
          </div>
          <Loader2
            className="h-6 w-6 animate-spin text-indigo-600 shrink-0"
            aria-hidden="true"
          />
        </div>

        <div className="mt-6 space-y-4">
          {steps.map((step, index) => {
            const isDone = step.status === "done" || step.status === "fallback";
            const isActive = step.status === "active";

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`rounded-xl border p-4 transition-colors ${
                  isActive
                    ? "border-indigo-200 bg-indigo-50/50"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      animate={isDone ? { scale: [0.85, 1.08, 1] } : undefined}
                      transition={{ duration: 0.22 }}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        step.id
                      )}
                    </motion.div>
                    <p
                      className={`text-sm font-semibold truncate ${
                        isActive || isDone ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>

                  {step.id === 1 && isActive && (
                    <span className="font-mono text-xs font-semibold text-indigo-700 tabular-nums shrink-0">
                      {cutoutProgress}%
                    </span>
                  )}
                  {isDone && (
                    <span className="text-xs font-medium text-emerald-700 shrink-0">
                      {step.status === "fallback" ? "Photo originale conservée" : "Terminé"}
                    </span>
                  )}
                </div>

                {step.id === 1 && isActive && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                    <motion.div
                      className="h-full rounded-full bg-indigo-600"
                      initial={{ width: "8%" }}
                      animate={{ width: `${Math.max(8, cutoutProgress)}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </div>
                )}

                {step.detail && (
                  <p className="mt-2 pl-10 text-xs text-slate-500">
                    {step.detail}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
