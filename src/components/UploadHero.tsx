import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  ArrowRight,
  Camera,
  ImagePlus,
  Lock,
  RefreshCw,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import type { ToneOption } from "../types/eradiz";

interface UploadHeroProps {
  selectedFile: File | null;
  previewUrl: string | null;
  imageDimensions: { width: number; height: number } | null;
  price: string;
  promoBadge: string;
  tone: ToneOption;
  credits: number;
  requiresAuth?: boolean;
  isGenerating: boolean;
  errorMessage: string | null;
  onFileSelected: (file: File) => void;
  onPriceChange: (value: string) => void;
  onPromoBadgeChange: (value: string) => void;
  onToneChange: (value: ToneOption) => void;
  onGenerate: () => void;
  onOpenPricing: () => void;
}

const TONE_OPTIONS: { value: ToneOption; label: string }[] = [
  { value: "Dynamique Réseaux Sociaux", label: "Réseaux Sociaux" },
  { value: "Professionnel E-commerce", label: "E-commerce Pro" },
  { value: "Luxe", label: "Luxe" },
];

const QUICK_PROMO_SUGGESTIONS = [
  "-20 %",
  "Livraison Gratuite",
  "Nouvel Arrivage",
  "Offre Limitée",
];

export function UploadHero({
  selectedFile,
  previewUrl,
  imageDimensions,
  price,
  promoBadge,
  tone,
  credits,
  requiresAuth = false,
  isGenerating,
  errorMessage,
  onFileSelected,
  onPriceChange,
  onPromoBadgeChange,
  onToneChange,
  onGenerate,
  onOpenPricing,
}: UploadHeroProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const hasCredits = credits > 0;
  const canGenerate = Boolean(
    selectedFile && previewUrl && (requiresAuth || hasCredits) && !isGenerating
  );

  return (
    <section
      id="atelier"
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Colonne Gauche : Contexte Studio */}
        <div className="lg:col-span-5 lg:pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Le Studio Eradiz
          </p>
          <h1
            className="mt-2 font-display font-extrabold tracking-tight text-slate-900 text-balance"
            style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)", lineHeight: 1.1 }}
          >
            Effacez le fond, boostez vos ventes.
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl">
            Prenez votre produit en photo ou importez depuis la galerie. Eradiz
            supprime l’arrière-plan, génère votre fiche SEO et compose 3 affiches
            publicitaires prêtes à partager.
          </p>

          <ol className="mt-6 space-y-3.5 border-t border-slate-200 pt-5 hidden lg:block">
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-600 pt-0.5 tabular-nums">
                01.
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Détourage gratuit côté client
                </p>
                <p className="text-xs text-slate-500">
                  Exécuté localement sur votre appareil, avec bascule « Avec
                  détourage / Photo originale ».
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-600 pt-0.5 tabular-nums">
                02.
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Analyse IA Vision &amp; rédaction SEO
                </p>
                <p className="text-xs text-slate-500">
                  Titre SEO, accroche WhatsApp/Instagram, 4 bénéfices boutique et
                  10 hashtags ciblés.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-indigo-600 pt-0.5 tabular-nums">
                03.
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Affiches PNG 1:1 &amp; 9:16 + Partage natif
                </p>
                <p className="text-xs text-slate-500">
                  Téléchargement HD ou partage direct vers WhatsApp, Instagram et
                  TikTok.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Colonne Droite : Importation mobile-first & options rapides */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-7">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="sr-only"
              aria-label="Choisir une photo dans la galerie"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="sr-only"
              aria-label="Prendre une photo avec la caméra"
            />

            {!previewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                  isDragging
                    ? "border-indigo-600 bg-indigo-50/70"
                    : "border-slate-300 bg-slate-50/60"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-3 font-display text-base font-bold text-slate-900">
                  Importez votre photo produit
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Glissez-déposez un fichier ici ou utilisez les boutons ci-dessous
                </p>

                {/* Boutons tactiles mobile-first */}
                <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 active:bg-slate-950 transition-colors cursor-pointer"
                  >
                    <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Prendre une photo (Caméra)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Choisir dans la galerie</span>
                  </button>
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  Formats supportés : JPG · PNG · WebP
                </p>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-5 rounded-xl border p-4 transition-colors ${
                  isDragging
                    ? "border-indigo-600 bg-indigo-50/60"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <img
                    src={previewUrl}
                    alt="Aperçu du produit importé"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-full">
                    {selectedFile?.name}
                  </p>
                  {imageDimensions && (
                    <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                      {imageDimensions.width} × {imageDimensions.height} px
                      {selectedFile
                        ? ` · ${(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo`
                        : ""}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Reprendre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Autre photo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Options rapides */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="product-price"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Prix du produit{" "}
                  <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  id="product-price"
                  type="text"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  placeholder="ex: $25.00"
                  maxLength={32}
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>

              <div>
                <label
                  htmlFor="promo-badge"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Badge promo{" "}
                  <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  id="promo-badge"
                  type="text"
                  value={promoBadge}
                  onChange={(e) => onPromoBadgeChange(e.target.value)}
                  placeholder="ex: -20 %, Livraison Gratuite"
                  maxLength={28}
                  className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMO_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onPromoBadgeChange(suggestion)}
                      className={`min-h-[34px] rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        promoBadge === suggestion
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ton du texte */}
            <div className="mt-5">
              <span className="block text-xs font-semibold text-slate-700">
                Ton du texte
              </span>
              <div
                role="radiogroup"
                aria-label="Ton du texte marketing"
                className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3 rounded-xl bg-slate-100 p-1"
              >
                {TONE_OPTIONS.map((option) => {
                  const active = tone === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onToneChange(option.value)}
                      className={`relative min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                        active
                          ? "text-slate-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="studio-tone-pill"
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 35,
                          }}
                          className="absolute inset-0 rounded-lg bg-white shadow-xs"
                        />
                      )}
                      <span className="relative z-10">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {errorMessage}
              </div>
            )}

            {/* Credit depleted blocker (only shown when authenticated or in local mode) */}
            {!requiresAuth && !hasCredits && (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Lock
                    className="h-4 w-4 text-amber-700 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="text-xs sm:text-sm text-amber-950">
                    <p className="font-semibold">
                      Vous n’avez plus de crédit disponible.
                    </p>
                    <p className="text-amber-800">
                      Rechargez un pack ou activez +10 crédits (Mode Démo) pour continuer.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="shrink-0 min-h-[44px] rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Obtenir des crédits
                </button>
              </div>
            )}

            {/* Primary CTA */}
            <div className="mt-6">
              <motion.button
                type="button"
                disabled={!canGenerate}
                whileTap={canGenerate ? { scale: 0.985 } : undefined}
                onClick={onGenerate}
                className={`flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 font-display text-sm sm:text-base font-bold transition-colors ${
                  canGenerate
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 cursor-pointer"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                {!requiresAuth && !hasCredits ? (
                  <>
                    <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Générer avec Eradiz (0 crédit restant)</span>
                  </>
                ) : (
                  <>
                    <span>Générer avec Eradiz (1 crédit)</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </>
                )}
              </motion.button>
              {requiresAuth && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  Connexion gratuite requise au lancement pour recevoir vos 3
                  crédits offerts dans le cloud.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
