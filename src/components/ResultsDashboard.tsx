import { useEffect, useState } from "react";
import {
  Calculator,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Layers,
  Palette,
  RotateCcw,
  Search,
  Share2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { exportImageVariant } from "../services/adCanvasRenderer";
import type { RecordUsageInput } from "../services/userCreditsService";
import type {
  AdPosterRender,
  ImageExportFormat,
  ImageExportQuality,
  ProductAnalysis,
} from "../types/eradiz";

interface ResultsDashboardProps {
  analysis: ProductAnalysis;
  posters: AdPosterRender[];
  cutoutDataUrl: string;
  originalDataUrl: string;
  cutoutSucceeded: boolean;
  useCutout: boolean;
  themeColor: string;
  isRenderingPosters: boolean;
  onToggleCutout: (useCutout: boolean) => void;
  onThemeColorChange: (hex: string) => void;
  onOpenVideoStudio: () => void;
  onOpenCalculator: () => void;
  onOpenProfileCreations?: () => void;
  onRecordUsage?: (usage: RecordUsageInput) => void;
  onReset: () => void;
}

const PRESET_COLORS = [
  { name: "Indigo Électrique", hex: "#4F46E5" },
  { name: "Violet Studio", hex: "#7C3AED" },
  { name: "Slate Foncé", hex: "#0F172A" },
  { name: "Émeraude", hex: "#059669" },
  { name: "Corail Promo", hex: "#E11D48" },
  { name: "Ambre Doré", hex: "#D97706" },
];

type CopySectionKey = "seo" | "social" | "long" | "hashtags" | "meta" | "jsonld" | "all";

function CopyButton({
  copied,
  onClick,
  label = "Copier",
}: {
  copied: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Copié</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function dataUrlToImageFile(
  dataUrl: string,
  filename: string,
  mimeType: string
): File {
  const [header, base64] = dataUrl.split(",");
  const detectedMime = header?.match(/data:([^;]+)/)?.[1] || mimeType;
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: detectedMime });
}

function buildSocialShareUrls(params: {
  title: string;
  caption: string;
  hashtags: string[];
  appUrl: string;
}) {
  const hashBlock = params.hashtags.slice(0, 6).join(" ");
  const fullCaption = [params.title, "", params.caption, "", hashBlock]
    .filter(Boolean)
    .join("\n");

  const shortTweet = `${params.title} — ${params.caption}`.slice(0, 220);

  return {
    fullCaption,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(
      `${fullCaption}\n${params.appUrl}`
    )}`,
    twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shortTweet
    )}&url=${encodeURIComponent(params.appUrl)}`,
    linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      params.appUrl
    )}`,
  };
}

export function ResultsDashboard({
  analysis,
  posters,
  cutoutDataUrl,
  originalDataUrl,
  cutoutSucceeded,
  useCutout,
  themeColor,
  isRenderingPosters,
  onToggleCutout,
  onThemeColorChange,
  onOpenVideoStudio,
  onOpenCalculator,
  onOpenProfileCreations,
  onRecordUsage,
  onReset,
}: ResultsDashboardProps) {
  const [copiedKey, setCopiedKey] = useState<CopySectionKey | null>(null);
  const [imageQuality, setImageQuality] = useState<ImageExportQuality>("hd");
  const [imageFormat, setImageFormat] = useState<ImageExportFormat>("png");
  const [openSharePosterId, setOpenSharePosterId] = useState<string | null>(null);
  const [isSharingId, setIsSharingId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!openSharePosterId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSharePosterId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSharePosterId]);

  const handleDownloadPoster = async (
    dataUrl: string,
    baseWidth: number,
    baseHeight: number,
    slugPrefix: string,
    posterTitle: string
  ) => {
    try {
      const result = await exportImageVariant(
        dataUrl,
        baseWidth,
        baseHeight,
        imageQuality,
        imageFormat
      );
      const qTag =
        imageQuality === "ultra" ? "2k" : imageQuality === "web" ? "720p" : "hd";
      downloadPng(result.dataUrl, `${slugPrefix}-${qTag}.${result.extension}`);
      onRecordUsage?.({
        actionType: "image_export",
        title: `${analysis.shortPosterTitle} (${posterTitle})`,
        details: `${result.width}x${result.height} · ${result.extension.toUpperCase()}`,
      });
    } catch {
      downloadPng(dataUrl, `${slugPrefix}.png`);
    }
  };

  const handleCopy = async (key: CopySectionKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  const copyTextSilently = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard permission denials on social intent clicks
    }
  };

  const supportsNativeWebShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleWebSharePoster = async (poster: AdPosterRender) => {
    setIsSharingId(poster.id);
    const shareTitle = `${analysis.shortPosterTitle} — Eradiz`;
    const shareUrl =
      typeof window !== "undefined" ? window.location.origin : "https://eradiz.app";
    const hashtagsLine = analysis.hashtags.slice(0, 6).join(" ");
    const shareText = `${analysis.seoTitle}\n\n${analysis.socialShortDesc}\n\n${hashtagsLine}`;

    const qTag =
      imageQuality === "ultra" ? "2k" : imageQuality === "web" ? "720p" : "hd";

    try {
      // Préparation synchrone quand le format courant est déjà HD PNG (préserve le geste utilisateur iOS/Android)
      const exported =
        imageQuality === "hd" && imageFormat === "png"
          ? {
              dataUrl: poster.dataUrl,
              mimeType: "image/png",
              extension: "png",
              width: poster.width,
              height: poster.height,
            }
          : await exportImageVariant(
              poster.dataUrl,
              poster.width,
              poster.height,
              imageQuality,
              imageFormat
            );

      const fileName = `${slugBase}-${poster.id}-${qTag}.${exported.extension}`;
      const file = dataUrlToImageFile(
        exported.dataUrl,
        fileName,
        exported.mimeType
      );

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        setShareFeedback({ id: poster.id, message: "Affiche partagée !" });
        setOpenSharePosterId(null);
        onRecordUsage?.({
          actionType: "image_export",
          title: `${analysis.shortPosterTitle} (${poster.title})`,
          details: `Partage Web Share · ${exported.width}x${exported.height} · ${exported.extension.toUpperCase()}`,
        });
        window.setTimeout(() => setShareFeedback(null), 2800);
        return;
      }

      if (nav.share) {
        await nav.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareFeedback({ id: poster.id, message: "Publication partagée !" });
        setOpenSharePosterId(null);
        window.setTimeout(() => setShareFeedback(null), 2800);
        return;
      }

      // Repli bureau si Web Share API non supporté : téléchargement + copie + ouverture des réseaux
      downloadPng(exported.dataUrl, fileName);
      await copyTextSilently(shareText);
      setOpenSharePosterId(poster.id);
      setShareFeedback({
        id: poster.id,
        message: "Image enregistrée et texte copié : choisissez un réseau ci-dessous.",
      });
      window.setTimeout(() => setShareFeedback(null), 3500);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setOpenSharePosterId(poster.id);
      downloadPng(poster.dataUrl, `${slugBase}-${poster.id}-eradiz.png`);
      await copyTextSilently(shareText);
      setShareFeedback({
        id: poster.id,
        message: "Image téléchargée et texte copié : partagez sur vos réseaux ci-dessous.",
      });
      window.setTimeout(() => setShareFeedback(null), 3500);
    } finally {
      setIsSharingId(null);
    }
  };

  const fullLongText = [
    analysis.longDescription,
    "",
    ...analysis.benefits.map((b) => `• ${b}`),
  ].join("\n");

  const hashtagsText = analysis.hashtags.join(" ");

  const allCopyText = [
    analysis.seoTitle,
    "",
    analysis.socialShortDesc,
    "",
    fullLongText,
    "",
    hashtagsText,
  ].join("\n");

  const activeProductImage =
    useCutout && cutoutSucceeded ? cutoutDataUrl : originalDataUrl;

  const slugBase =
    analysis.shortPosterTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "eradiz-produit";

  const rawMetaSource = (analysis.longDescription || analysis.socialShortDesc)
    .replace(/\s+/g, " ")
    .trim();
  const seoMetaDescription =
    rawMetaSource.length <= 156
      ? rawMetaSource
      : `${rawMetaSource.slice(0, 153).replace(/\s+\S*$/, "")}...`;

  const productJsonLd = `<script type="application/ld+json">\n${JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: analysis.seoTitle,
      description: seoMetaDescription,
      category: analysis.detectedCategory,
      keywords: analysis.hashtags.map((h) => h.replace(/^#/, "")).join(", "),
    },
    null,
    2
  )}\n</script>`;

  return (
    <section
      id="resultats"
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
    >
      {/* Barre supérieure de contrôle */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-indigo-600">
              {analysis.detectedCategory}
            </span>
            <span aria-hidden="true">·</span>
            <span>Kit vendeur généré avec succès</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            {analysis.shortPosterTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bouton bascule Avec détourage / Photo originale */}
          <div
            role="group"
            aria-label="Mode d'affichage de l'image produit"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              disabled={!cutoutSucceeded}
              onClick={() => onToggleCutout(true)}
              className={`relative inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                useCutout && cutoutSucceeded
                  ? "text-slate-900 cursor-pointer"
                  : !cutoutSucceeded
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-slate-600 hover:text-slate-900 cursor-pointer"
              }`}
            >
              {useCutout && cutoutSucceeded && (
                <motion.span
                  layoutId="cutout-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-lg bg-white shadow-xs"
                />
              )}
              <Layers className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
              <span className="relative z-10">Avec détourage</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleCutout(false)}
              className={`relative inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                !useCutout || !cutoutSucceeded
                  ? "text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {(!useCutout || !cutoutSucceeded) && (
                <motion.span
                  layoutId="cutout-mode-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-lg bg-white shadow-xs"
                />
              )}
              <ImageIcon className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
              <span className="relative z-10">Photo originale</span>
            </button>
          </div>

          {cutoutSucceeded && (
            <button
              type="button"
              onClick={() =>
                downloadPng(cutoutDataUrl, `${slugBase}-detoure-eradiz.png`)
              }
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>PNG détouré</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenVideoStudio}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Film className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Vidéo Motion Design</span>
          </button>

          <button
            type="button"
            onClick={onOpenCalculator}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Calculer ma marge (USD)</span>
          </button>

          {onOpenProfileCreations && (
            <button
              type="button"
              onClick={onOpenProfileCreations}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ImageIcon className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
              <span>Mes créations</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Nouveau produit</span>
          </button>
        </div>
      </div>

      {/* Grille 2 colonnes */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* COLONNE GAUCHE : Textes Marketing copiables en 1 clic */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Textes Marketing &amp; SEO
            </h3>
            <CopyButton
              copied={copiedKey === "all"}
              onClick={() => handleCopy("all", allCopyText)}
              label="Tout copier"
            />
          </div>

          {/* Aperçu produit détouré / original */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500">
              <span>
                {useCutout && cutoutSucceeded
                  ? "Aperçu produit détouré (fond transparent)"
                  : "Aperçu photo originale"}
              </span>
              {!cutoutSucceeded && (
                <span className="text-amber-700 font-medium">
                  Détourage indisponible sur cette image
                </span>
              )}
            </div>
            <div
              className={`flex h-52 items-center justify-center p-4 ${
                useCutout && cutoutSucceeded ? "studio-checkerboard" : "bg-slate-100"
              }`}
            >
              <img
                src={activeProductImage}
                alt={analysis.seoTitle}
                className="max-h-44 max-w-full object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* 1. Titre SEO optimisé */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Titre SEO optimisé
              </span>
              <CopyButton
                copied={copiedKey === "seo"}
                onClick={() => handleCopy("seo", analysis.seoTitle)}
              />
            </div>
            <p className="mt-2.5 font-display text-base font-bold text-slate-900 leading-snug">
              {analysis.seoTitle}
            </p>
          </div>

          {/* 2. Description courte WhatsApp / Instagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Accroche WhatsApp / Instagram
              </span>
              <CopyButton
                copied={copiedKey === "social"}
                onClick={() => handleCopy("social", analysis.socialShortDesc)}
              />
            </div>
            <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {analysis.socialShortDesc}
            </p>
          </div>

          {/* 3. Description longue + 4 puces bénéfices */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fiche boutique en ligne
              </span>
              <CopyButton
                copied={copiedKey === "long"}
                onClick={() => handleCopy("long", fullLongText)}
              />
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
              {analysis.longDescription}
            </p>
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3.5">
              {analysis.benefits.map((benefit, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm text-slate-700"
                >
                  <span className="font-mono text-xs font-semibold text-indigo-600 pt-0.5 tabular-nums">
                    0{index + 1}
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. 10 hashtags pertinents */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                10 Hashtags ciblés
              </span>
              <CopyButton
                copied={copiedKey === "hashtags"}
                onClick={() => handleCopy("hashtags", hashtagsText)}
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed font-medium text-indigo-700 break-words">
              {hashtagsText}
            </p>
          </div>

          {/* 5. Aperçu Google & Pack SEO Boutique (Meta + JSON-LD Schema.org) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Search className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                <span>Aperçu Google &amp; SEO Boutique</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                Titre {analysis.seoTitle.length} car. · Meta {seoMetaDescription.length}/160
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <p className="truncate text-[11px] text-emerald-700 font-medium">
                votre-boutique.com/produits/{slugBase}
              </p>
              <p className="mt-0.5 line-clamp-1 font-display text-sm font-bold text-indigo-700">
                {analysis.seoTitle}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                {seoMetaDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CopyButton
                copied={copiedKey === "meta"}
                onClick={() => handleCopy("meta", seoMetaDescription)}
                label="Copier Meta Description"
              />
              <button
                type="button"
                onClick={() => handleCopy("jsonld", productJsonLd)}
                className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  copiedKey === "jsonld"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {copiedKey === "jsonld" ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>JSON-LD copié</span>
                  </>
                ) : (
                  <>
                    <Code2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
                    <span>Copier JSON-LD Produit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : Studio Visuels Publicitaires */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Studio Visuels Publicitaires
              </h3>
              <p className="text-xs text-slate-500">
                Personnalisez la couleur du thème pour actualiser les 3 affiches en direct.
              </p>
            </div>

            {/* Sélecteur de couleur */}
            <div className="flex flex-wrap items-center gap-2">
              <Palette className="h-4 w-4 text-slate-400 mr-1" aria-hidden="true" />
              {PRESET_COLORS.map((preset) => {
                const selected =
                  themeColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.name}
                    aria-label={`Couleur ${preset.name}`}
                    onClick={() => onThemeColorChange(preset.hex)}
                    className={`h-8 w-8 rounded-full border transition-transform cursor-pointer ${
                      selected
                        ? "scale-110 ring-2 ring-slate-900 ring-offset-2 border-white"
                        : "border-slate-200 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                );
              })}

              <label
                className="relative inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Choisir une couleur personnalisée"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: themeColor }}
                />
                <span className="font-mono text-[11px] uppercase">
                  {themeColor}
                </span>
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => onThemeColorChange(e.target.value)}
                  aria-label="Couleur personnalisée des affiches"
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Barre Qualité & Format d'image */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Qualité d’image à enregistrer
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      { id: "web", label: "Web (720px)" },
                      { id: "hd", label: "HD (1080px)" },
                      { id: "ultra", label: "2K (2160px)" },
                    ] as const
                  ).map((q) => {
                    const active = imageQuality === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setImageQuality(q.id)}
                        className={`relative min-h-[36px] rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="img-quality-pill"
                            transition={{
                              type: "spring",
                              stiffness: 450,
                              damping: 35,
                            }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Format de fichier
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      { id: "png", label: "PNG" },
                      { id: "jpeg", label: "JPG" },
                      { id: "webp", label: "WebP" },
                    ] as const
                  ).map((fmt) => {
                    const active = imageFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setImageFormat(fmt.id)}
                        className={`relative min-h-[36px] rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="img-format-pill"
                            transition={{
                              type: "spring",
                              stiffness: 450,
                              damping: 35,
                            }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3 modèles graphiques */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {posters.map((poster, idx) => {
              const isVertical = poster.height > poster.width;
              const feedbackForPoster =
                shareFeedback?.id === poster.id ? shareFeedback.message : null;
              const isShareOpen = openSharePosterId === poster.id;
              const isSharing = isSharingId === poster.id;
              const qualityLabel =
                imageQuality === "ultra"
                  ? "2K"
                  : imageQuality === "web"
                    ? "Web"
                    : "HD";
              const formatLabel = imageFormat === "jpeg" ? "JPG" : imageFormat.toUpperCase();
              const socialLinks = buildSocialShareUrls({
                title: analysis.seoTitle,
                caption: analysis.socialShortDesc,
                hashtags: analysis.hashtags,
                appUrl:
                  typeof window !== "undefined"
                    ? window.location.origin
                    : "https://eradiz.app",
              });

              return (
                <motion.article
                  key={poster.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: idx * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 ${
                    isVertical ? "md:col-span-2" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 pb-3">
                      <div>
                        <h4 className="font-display text-base font-bold text-slate-900">
                          Modèle « {poster.title} »
                        </h4>
                        <p className="text-xs text-slate-500">
                          {poster.subtitle} · {poster.aspectLabel}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center ${
                        isVertical ? "max-h-[520px] py-4" : "aspect-square"
                      }`}
                    >
                      <img
                        src={poster.dataUrl}
                        alt={`Affiche publicitaire ${poster.title} pour ${analysis.shortPosterTitle}`}
                        className={`object-contain transition-opacity duration-150 ${
                          isRenderingPosters ? "opacity-60" : "opacity-100"
                        } ${
                          isVertical
                            ? "max-h-[480px] w-auto rounded-lg shadow-md"
                            : "h-full w-full"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadPoster(
                          poster.dataUrl,
                          poster.width,
                          poster.height,
                          `${slugBase}-${poster.id}-eradiz`,
                          poster.title
                        )
                      }
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        Enregistrer {qualityLabel} ({formatLabel})
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSharing}
                      aria-expanded={isShareOpen}
                      onClick={() => {
                        if (supportsNativeWebShare) {
                          void handleWebSharePoster(poster);
                        } else {
                          setOpenSharePosterId((cur) =>
                            cur === poster.id ? null : poster.id
                          );
                        }
                      }}
                      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                        isShareOpen
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100"
                      }`}
                    >
                      <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isSharing ? "Partage en cours..." : "Partager"}
                      </span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isShareOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                              Partager l’affiche « {poster.title} »
                            </span>
                            <button
                              type="button"
                              aria-label="Fermer le menu de partage"
                              onClick={() => setOpenSharePosterId(null)}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={isSharing}
                            onClick={() => void handleWebSharePoster(poster)}
                            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>
                              {isSharing
                                ? "Préparation de l’image..."
                                : `Partage direct · Web Share (${qualityLabel} ${formatLabel})`}
                            </span>
                          </button>

                          <div className="grid grid-cols-3 gap-2">
                            <a
                              href={socialLinks.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                void copyTextSilently(socialLinks.fullCaption);
                                setShareFeedback({
                                  id: poster.id,
                                  message: "Ouverture de WhatsApp (texte copié).",
                                });
                                window.setTimeout(() => setShareFeedback(null), 2600);
                              }}
                              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>

                            <a
                              href={socialLinks.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                void copyTextSilently(socialLinks.fullCaption);
                                setShareFeedback({
                                  id: poster.id,
                                  message: "Ouverture de Twitter / X (texte copié).",
                                });
                                window.setTimeout(() => setShareFeedback(null), 2600);
                              }}
                              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              <span>Twitter / X</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>

                            <a
                              href={socialLinks.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                void copyTextSilently(socialLinks.fullCaption);
                                setShareFeedback({
                                  id: poster.id,
                                  message: "Ouverture de LinkedIn (texte copié à coller).",
                                });
                                window.setTimeout(() => setShareFeedback(null), 2800);
                              }}
                              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition-colors whitespace-nowrap"
                            >
                              <span>LinkedIn</span>
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {feedbackForPoster && (
                    <p
                      role="status"
                      className="mt-2 text-center text-xs font-medium text-emerald-700"
                    >
                      {feedbackForPoster}
                    </p>
                  )}
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
