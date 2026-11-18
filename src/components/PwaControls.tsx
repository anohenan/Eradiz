import { useState } from "react";
import { Download, Smartphone, WifiOff, X } from "lucide-react";
import { useOnlineStatus, usePWAInstall } from "../hooks/usePWAInstall";

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap shrink-0 font-semibold ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm"
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Installer l’app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 font-semibold ${
            compact ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Installer sur iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Fermer"
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <h3
                id="ios-install-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                Installer Eradiz sur iPhone
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  1. Touchez le bouton <strong>Partager</strong> dans la barre de Safari.
                </li>
                <li>
                  2. Faites défiler et sélectionnez{" "}
                  <strong>Sur l’écran d’accueil</strong>.
                </li>
                <li>
                  3. Confirmez avec <strong>Ajouter</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-18 left-4 right-4 md:bottom-5 md:left-5 md:right-auto z-50 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-950 shadow-lg"
    >
      <WifiOff className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
      <span>
        Mode hors-ligne — Interface en cache disponible. Connexion requise pour l’analyse IA.
      </span>
    </div>
  );
}
