import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  CreditCard,
  Image as ImageIcon,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { UsageRecord } from "../services/userCreditsService";
import type { AuthModalTab } from "./AuthModal";
import { EradizLogo } from "./EradizLogo";
import type { AppView } from "./MobileBottomNav";
import { PWAInstallButton } from "./PwaControls";
import type { ProfileTabId } from "./UserProfileView";

export interface NavbarUserInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

interface NavbarProps {
  activeView: AppView;
  isFirebaseMode: boolean;
  authReady: boolean;
  user: NavbarUserInfo | null;
  credits: number;
  activePlan: string;
  creationsCount?: number;
  recentUsages?: UsageRecord[];
  onNavigate: (view: AppView) => void;
  onOpenProfile: (tab?: ProfileTabId) => void;
  onOpenPricing: () => void;
  onOpenAuth: (tab?: AuthModalTab) => void;
  onSignOut: () => void;
}

const ACTION_TYPE_LABELS: Record<UsageRecord["actionType"], string> = {
  ai_studio_kit: "Studio IA",
  video_export: "Vidéo Motion",
  image_export: "Affiche HD",
  calculator_session: "Pertes & Bénéfices",
};

const DESKTOP_TABS: { id: AppView; label: string }[] = [
  { id: "home", label: "Accueil" },
  { id: "studio", label: "Studio Eradiz" },
  { id: "video", label: "Vidéo Motion" },
  { id: "calculator", label: "Pertes & Bénéfices" },
  { id: "legal", label: "Légal" },
];

export function Navbar({
  activeView,
  isFirebaseMode,
  authReady,
  user,
  credits,
  activePlan,
  creationsCount = 0,
  recentUsages = [],
  onNavigate,
  onOpenProfile,
  onOpenPricing,
  onOpenAuth,
  onSignOut,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const creditLabel = `${credits} ${credits > 1 ? "crédits" : "crédit"}`;
  const userInitial = (
    user?.displayName?.trim()?.[0] ||
    user?.email?.trim()?.[0] ||
    "E"
  ).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Zone 1 : Brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg cursor-pointer"
        >
          <EradizLogo size={28} showWordmark />
        </button>

        {/* Zone 2 : Desktop view links with animated underline */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {DESKTOP_TABS.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "text-slate-900 font-semibold"
                    : "hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="desktop-nav-underline"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-indigo-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3 : Auth / Credits / User Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="hidden lg:block">
            <PWAInstallButton compact />
          </div>

          {isFirebaseMode ? (
            !authReady ? (
              <div className="h-9 w-36 rounded-lg bg-slate-100 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Solde de crédits synchronisé en temps réel */}
                <button
                  type="button"
                  onClick={onOpenPricing}
                  title="Gérer mes crédits"
                  className={`inline-flex min-h-[34px] items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                    credits === 0
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {creditLabel}
                </button>

                {/* Menu déroulant profil utilisateur */}
                <div ref={menuContainerRef} className="relative">
                  <button
                    type="button"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer max-w-[200px]"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || user.email}
                        className="h-6 w-6 rounded-full object-cover shrink-0 border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                        {userInitial}
                      </span>
                    )}
                    <span className="hidden sm:inline truncate">
                      {user.email || user.displayName}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                        menuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50"
                      >
                        <div className="border-b border-slate-100 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <UserIcon
                              className="h-3.5 w-3.5 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                            <p className="truncate text-xs font-bold text-slate-900">
                              {user.displayName || "Compte Eradiz"}
                            </p>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {user.email}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-500">{activePlan}</span>
                            <span className="font-semibold text-indigo-600 tabular-nums">
                              {creditLabel}
                            </span>
                          </div>
                        </div>

                        {recentUsages.length > 0 && (
                          <div className="border-b border-slate-100 px-3 py-2">
                            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                Utilisations enregistrées
                              </span>
                              <span className="font-mono text-indigo-600 tabular-nums">
                                {recentUsages.length}
                              </span>
                            </div>
                            <ul className="mt-1.5 space-y-1">
                              {recentUsages.slice(0, 3).map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="truncate font-medium text-slate-700">
                                    {item.title}
                                  </span>
                                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                    {ACTION_TYPE_LABELS[item.actionType]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-1 space-y-1">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onOpenProfile("creations");
                            }}
                            className="flex min-h-[40px] w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            <span className="inline-flex items-center gap-2.5">
                              <ImageIcon
                                className="h-4 w-4 shrink-0 text-indigo-600"
                                aria-hidden="true"
                              />
                              <span>Mes créations (affiches)</span>
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-indigo-600 tabular-nums">
                              {creationsCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onOpenProfile("account");
                            }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            <UserIcon
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Mon profil &amp; Utilisations</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onOpenPricing();
                            }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            <CreditCard
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Acheter des crédits</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onSignOut();
                            }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <LogOut
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Se déconnecter</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth("register")}
                className="inline-flex min-h-[38px] md:min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>Connexion / Inscription</span>
              </motion.button>
            )
          ) : (
            /* Mode secours localStorage */
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onOpenProfile("creations")}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ImageIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Mes créations ({creationsCount})</span>
                <span className="sm:hidden">{creationsCount}</span>
              </button>
              <span
                className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                  credits === 0 ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {creditLabel}
              </span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onOpenPricing}
                className="inline-flex min-h-[36px] md:min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CreditCard
                  className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>Acheter des crédits</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
