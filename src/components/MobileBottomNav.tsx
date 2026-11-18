import { Calculator, Film, Home, ShieldCheck, User, Wand2 } from "lucide-react";

export type AppView =
  | "home"
  | "studio"
  | "video"
  | "calculator"
  | "profile"
  | "legal";

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function MobileBottomNav({
  activeView,
  onNavigate,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden pb-safe"
    >
      <div className="grid h-14 grid-cols-6 items-center">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "home"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Accueil
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("studio")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "studio"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Studio
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("video")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "video"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Film className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Vidéo
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("calculator")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "calculator"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Marges
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("profile")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "profile"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <User className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Profil
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("legal")}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            activeView === "legal"
              ? "text-indigo-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            Légal
          </span>
        </button>
      </div>
    </nav>
  );
}
