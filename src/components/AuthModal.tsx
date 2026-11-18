import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  translateFirebaseAuthError,
} from "../services/firebase";
import { ensureUserProfileDocument } from "../services/userCreditsService";
import { EradizLogo } from "./EradizLogo";

export type AuthModalTab = "login" | "register";

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: AuthModalTab;
  reasonMessage?: string | null;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  initialTab = "login",
  reasonMessage = null,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthModalTab>(initialTab);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg(null);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoadingGoogle) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoadingGoogle, onClose]);

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setErrorMsg(
        "Firebase n'est pas configuré dans cet environnement. Le mode local est actif."
      );
      return;
    }

    setErrorMsg(null);
    setIsLoadingGoogle(true);

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      try {
        await ensureUserProfileDocument(credential.user);
      } catch (profileErr) {
        console.error(
          "Erreur synchronisation profil après connexion Google :",
          profileErr
        );
      }
      onAuthSuccess?.();
      onClose();
    } catch (error) {
      setErrorMsg(translateFirebaseAuthError(error));
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoadingGoogle) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl"
          >
            <button
              type="button"
              disabled={isLoadingGoogle}
              onClick={onClose}
              aria-label="Fermer la fenêtre d'authentification"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-8">
              <div className="flex items-center gap-2.5">
                <EradizLogo size={26} />
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>5 crédits gratuits à l’inscription</span>
                </div>
              </div>
              <h2
                id="auth-modal-title"
                className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-slate-900"
              >
                {tab === "login"
                  ? "Connexion à Eradiz"
                  : "Créer un compte Eradiz"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Connectez-vous en 1 clic avec votre compte Google pour recevoir
                vos 5 crédits gratuits et sauvegarder toutes vos créations.
              </p>
            </div>

            {reasonMessage && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs font-medium text-indigo-900">
                {reasonMessage}
              </div>
            )}

            {/* Onglets Connexion / Inscription */}
            <div
              role="tablist"
              aria-label="Choix de connexion ou d'inscription"
              className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
            >
              {(
                [
                  { id: "login", label: "Connexion" },
                  { id: "register", label: "Inscription" },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={isLoadingGoogle}
                    onClick={() => {
                      setTab(item.id);
                      setErrorMsg(null);
                    }}
                    className={`relative min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? "text-slate-900"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="auth-modal-tab-pill"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                        className="absolute inset-0 rounded-lg bg-white shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Avantages compte */}
            <ul className="mt-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <Check
                  className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  <strong>5 crédits offerts</strong> dès votre première connexion
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check
                  className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  Affiches HD, fiches SEO &amp; historique sauvegardés dans le
                  cloud
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check
                  className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>Aucun mot de passe à retenir, accès multi-appareils</span>
              </li>
            </ul>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 leading-relaxed"
              >
                {errorMsg}
              </div>
            )}

            {/* Bouton principal Google */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              disabled={isLoadingGoogle}
              onClick={() => void handleGoogleSignIn()}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 active:bg-slate-950 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoadingGoogle ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-white"
                  aria-hidden="true"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shrink-0">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </span>
              )}
              <span>
                {isLoadingGoogle
                  ? "Connexion Google en cours..."
                  : tab === "register"
                    ? "Créer mon compte avec Google (5 crédits)"
                    : "Continuer avec Google"}
              </span>
            </motion.button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck
                className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                aria-hidden="true"
              />
              <span>Authentification sécurisée via Google &amp; Firebase</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
