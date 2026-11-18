import { Check, Lock, Sparkles, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { EradizLogo } from "./EradizLogo";

interface AuthGateViewProps {
  targetLabel: string;
  onRegister: () => void;
  onLogin: () => void;
  onBackHome: () => void;
}

export function AuthGateView({
  targetLabel,
  onRegister,
  onLogin,
  onBackHome,
}: AuthGateViewProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          <EradizLogo size={32} />
          <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Inscription requise · {targetLabel}</span>
          </div>
        </div>

        <h1 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Créez votre compte gratuit pour utiliser Eradiz
        </h1>
        <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-slate-600">
          L’inscription permet d’enregistrer directement vos utilisations, de
          synchroniser vos crédits en temps réel et de sécuriser vos exports sur
          mobile et ordinateur.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 border-y border-slate-100 py-5 text-sm text-slate-700">
          <li className="flex items-start gap-2.5">
            <Check
              className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>5 crédits offerts dès l’inscription</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>Historique d’utilisation enregistré dans le cloud</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>Studio IA, Vidéo Motion &amp; Calculateur USD inclus</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>Inscription en 10 secondes avec votre compte Google</span>
          </li>
        </ul>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onRegister}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-display text-sm sm:text-base font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Créer un compte gratuit (5 crédits)</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onLogin}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden="true" />
            <span>J’ai déjà un compte</span>
          </motion.button>
        </div>

        <div className="mt-5 text-center sm:text-left">
          <button
            type="button"
            onClick={onBackHome}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ← Retour à la page d’accueil
          </button>
        </div>
      </motion.div>
    </section>
  );
}
