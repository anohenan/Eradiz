import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Check,
  Download,
  Film,
  ImagePlus,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import {
  prepareImageForProcessing,
  removeProductBackground,
  loadImageElement,
} from "../services/backgroundRemover";
import {
  detectProductBounds,
  drawMotionVideoFrame,
  exportMotionVideo,
  getVideoDimensions,
  type BoundingBox,
  type VideoExportResult,
} from "../services/motionVideoRenderer";
import apresProduitStudioImg from "../assets/images/apres_produit_studio_1794674948551.jpg";
import type { RecordUsageInput } from "../services/userCreditsService";
import type {
  MotionFormatId,
  MotionPresetId,
  MotionVideoConfig,
  VideoFpsOption,
  VideoQualityId,
} from "../types/eradiz";

interface MotionVideoStudioProps {
  initialImageSrc?: string | null;
  initialIsCutout?: boolean;
  initialTitle?: string;
  initialPrice?: string;
  initialPromoBadge?: string;
  initialThemeColor?: string;
  onGoToAiStudio?: () => void;
  onRecordUsage?: (usage: RecordUsageInput) => void;
}

const DEFAULT_SAMPLE_IMAGE = apresProduitStudioImg;

const MOTION_PRESETS: {
  id: MotionPresetId;
  name: string;
  desc: string;
}[] = [
  {
    id: "kinetic-flash",
    name: "Flash Cinétique",
    desc: "Anneaux orbitaux, particules & badges dynamiques",
  },
  {
    id: "studio-luxe",
    name: "Studio Luxe",
    desc: "Cadre épuré, lévitation douce & reflets premium",
  },
  {
    id: "tiktok-pulse",
    name: "TikTok Pulse",
    desc: "Rythme rapide, bandeau défilant & zoom percutant",
  },
];

const THEME_SWATCHES = [
  "#4F46E5",
  "#7C3AED",
  "#0F172A",
  "#059669",
  "#E11D48",
  "#D97706",
];

export function MotionVideoStudio({
  initialImageSrc,
  initialIsCutout = true,
  initialTitle,
  initialPrice,
  initialPromoBadge,
  initialThemeColor,
  onGoToAiStudio,
  onRecordUsage,
}: MotionVideoStudioProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string>(
    initialImageSrc || DEFAULT_SAMPLE_IMAGE
  );
  const [originalSrc, setOriginalSrc] = useState<string>(
    initialImageSrc || DEFAULT_SAMPLE_IMAGE
  );
  const [cutoutSrc, setCutoutSrc] = useState<string | null>(
    initialIsCutout ? initialImageSrc || DEFAULT_SAMPLE_IMAGE : null
  );
  const [isCutout, setIsCutout] = useState<boolean>(initialIsCutout);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const [preset, setPreset] = useState<MotionPresetId>("kinetic-flash");
  const [format, setFormat] = useState<MotionFormatId>("story-9-16");
  const [quality, setQuality] = useState<VideoQualityId>("hd");
  const [fps, setFps] = useState<VideoFpsOption>(30);
  const [durationSec, setDurationSec] = useState<5 | 8 | 12>(5);
  const [themeColor, setThemeColor] = useState<string>(
    initialThemeColor || "#4F46E5"
  );
  const [title, setTitle] = useState<string>(
    initialTitle || "Sneakers Air Pulse Édition Studio"
  );
  const [price, setPrice] = useState<string>(initialPrice || "$49.00 USD");
  const [promoBadge, setPromoBadge] = useState<string>(
    initialPromoBadge || "-20 % · OFFRE FLASH"
  );
  const [ctaText, setCtaText] = useState<string>("Commandez maintenant");

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  // Loaded image + bounds for 60fps canvas loop
  const loadedImgRef = useRef<{
    img: HTMLImageElement;
    bounds: BoundingBox;
  } | null>(null);
  const [imageLoadedTick, setImageLoadedTick] = useState(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [exportedVideo, setExportedVideo] = useState<VideoExportResult | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync if parent updates initial props (e.g. coming from Studio Results)
  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
      setOriginalSrc(initialImageSrc);
      setCutoutSrc(initialIsCutout ? initialImageSrc : null);
      setIsCutout(initialIsCutout);
    }
  }, [initialImageSrc, initialIsCutout]);

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialPrice !== undefined && initialPrice !== "") {
      setPrice(initialPrice);
    }
  }, [initialPrice]);

  useEffect(() => {
    if (initialPromoBadge !== undefined && initialPromoBadge !== "") {
      setPromoBadge(initialPromoBadge);
    }
  }, [initialPromoBadge]);

  useEffect(() => {
    if (initialThemeColor) setThemeColor(initialThemeColor);
  }, [initialThemeColor]);

  // Clean up object URL when unmounting or re-exporting
  useEffect(() => {
    return () => {
      if (exportedVideo?.url) {
        URL.revokeObjectURL(exportedVideo.url);
      }
    };
  }, [exportedVideo]);

  // Load image & detect opaque bounds
  useEffect(() => {
    let cancelled = false;
    loadImageElement(imageSrc)
      .then((img) => {
        if (cancelled) return;
        const bounds = isCutout
          ? detectProductBounds(img)
          : { sx: 0, sy: 0, sw: img.width, sh: img.height };
        loadedImgRef.current = { img, bounds };
        setImageLoadedTick((t) => t + 1);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Impossible de charger l'image pour l'aperçu vidéo.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageSrc, isCutout]);

  const currentConfig: MotionVideoConfig = {
    imageSrc,
    isCutout,
    preset,
    format,
    quality,
    fps,
    durationSec,
    themeColor,
    title,
    price,
    promoBadge,
    ctaText,
  };

  // Real-time canvas animation loop (simulates selected FPS)
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const loaded = loadedImgRef.current;
    if (!canvas || !loaded) return;

    const { width, height } = getVideoDimensions(format, quality);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg: MotionVideoConfig = {
      imageSrc,
      isCutout,
      preset,
      format,
      quality,
      fps,
      durationSec,
      themeColor,
      title,
      price,
      promoBadge,
      ctaText,
    };

    if (!isPlaying) {
      drawMotionVideoFrame(ctx, loaded.img, loaded.bounds, cfg, progressRef.current);
      return;
    }

    let rafId = 0;
    let lastTick = performance.now();
    let lastDraw = performance.now();
    const durationMs = durationSec * 1000;
    const minFrameMs = 1000 / fps;

    const renderLoop = (now: number) => {
      const delta = now - lastTick;
      lastTick = now;
      const nextProgress = (progressRef.current + delta / durationMs) % 1;
      progressRef.current = nextProgress;

      if (now - lastDraw >= minFrameMs * 0.9) {
        lastDraw = now;
        setProgress(nextProgress);
        drawMotionVideoFrame(ctx, loaded.img, loaded.bounds, cfg, nextProgress);
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [
    isPlaying,
    imageLoadedTick,
    imageSrc,
    isCutout,
    preset,
    format,
    quality,
    fps,
    durationSec,
    themeColor,
    title,
    price,
    promoBadge,
    ctaText,
  ]);

  const handleUploadCustomImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setIsRemovingBg(true);

    try {
      const prepared = await prepareImageForProcessing(file);
      setOriginalSrc(prepared.originalDataUrl);
      setImageSrc(prepared.originalDataUrl);
      setIsCutout(false);
      setCutoutSrc(null);

      const bgRes = await removeProductBackground(prepared.originalDataUrl);
      if (bgRes.succeeded) {
        setCutoutSrc(bgRes.cutoutDataUrl);
        setImageSrc(bgRes.cutoutDataUrl);
        setIsCutout(true);
      }
      progressRef.current = 0;
      setProgress(0);
      setIsPlaying(true);
    } catch {
      setErrorMessage("Impossible d'importer cette image.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleToggleCutoutMode = (nextCutout: boolean) => {
    if (nextCutout && cutoutSrc) {
      setImageSrc(cutoutSrc);
      setIsCutout(true);
    } else {
      setImageSrc(originalSrc);
      setIsCutout(false);
    }
  };

  const handleExportVideo = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsExporting(true);
    setExportPercent(0);

    try {
      const result = await exportMotionVideo(currentConfig, (pct) => {
        setExportPercent(pct);
      });

      if (exportedVideo?.url) {
        URL.revokeObjectURL(exportedVideo.url);
      }
      setExportedVideo(result);

      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "eradiz-motion";
      const qualityTag =
        quality === "fullhd" ? "fullhd" : quality === "sd" ? "sd" : "hd";
      const filename = `${slug}-${preset}-${qualityTag}-${fps}fps.${result.extension}`;

      const link = document.createElement("a");
      link.href = result.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const dims = getVideoDimensions(format, quality);
      setStatusMessage(
        `Vidéo exportée (${dims.width}×${dims.height} · ${fps} FPS · ${result.extension.toUpperCase()}) !`
      );
      onRecordUsage?.({
        actionType: "video_export",
        title: title.trim() || "Vidéo Motion",
        details: `${dims.width}×${dims.height} · ${fps} FPS · ${durationSec}s`,
      });
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'exporter la vidéo sur ce navigateur."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareVideo = async () => {
    if (!exportedVideo) {
      await handleExportVideo();
      return;
    }

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "eradiz-motion";
    const filename = `${slug}-${preset}.${exportedVideo.extension}`;
    const file = new File([exportedVideo.blob], filename, {
      type: exportedVideo.mimeType,
    });

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    try {
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: `${title} — Eradiz Vidéo Motion`,
          files: [file],
        });
        setStatusMessage("Vidéo partagée !");
        return;
      }
      setStatusMessage(
        "Partage direct disponible sur mobile — le fichier est déjà prêt dans vos téléchargements."
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatusMessage("Utilisez le fichier téléchargé pour le publier.");
    }
  };

  const isVertical = format === "story-9-16";
  const exportDims = getVideoDimensions(format, quality);
  const qualityDisplayName =
    quality === "fullhd" ? "Full HD" : quality === "sd" ? "Standard" : "HD";

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Film className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Studio Vidéo Motion Design</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Créez votre vidéo pub animée en 1 clic
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rendu 100 % local dans votre navigateur, prêt pour TikTok,
            Instagram Reels, WhatsApp Statut et Shopify.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleUploadCustomImage(e)}
            className="sr-only"
          />
          <button
            type="button"
            disabled={isRemovingBg || isExporting}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isRemovingBg ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <ImagePlus className="h-4 w-4 text-indigo-600" />
            )}
            <span>
              {isRemovingBg ? "Détourage en cours..." : "Importer ma photo"}
            </span>
          </button>

          {onGoToAiStudio && (
            <button
              type="button"
              onClick={onGoToAiStudio}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-indigo-300" />
              <span>Studio IA Complet</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* COLONNE GAUCHE : Lecteur Vidéo Motion Design en temps réel */}
        <div className="lg:col-span-5 flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex w-full items-center justify-between pb-3 text-xs font-semibold text-slate-600">
            <span>
              {exportDims.width}×{exportDims.height} · {fps} FPS
            </span>
            <span className="font-mono text-indigo-600 tabular-nums">
              {(progress * durationSec).toFixed(1)}s / {durationSec}.0s
            </span>
          </div>

          <div
            className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${
              isVertical ? "max-w-[330px] aspect-[9/16]" : "aspect-square"
            }`}
          >
            <canvas
              ref={previewCanvasRef}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Contrôles lecteur + Timeline */}
          <div className="mt-4 w-full space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                aria-label={isPlaying ? "Mettre en pause" : "Lire l'animation"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 1000;
                  progressRef.current = val;
                  setProgress(val);
                  setIsPlaying(false);
                }}
                aria-label="Position dans la vidéo"
                className="flex-1 accent-indigo-600 cursor-pointer"
              />

              <button
                type="button"
                onClick={() => {
                  progressRef.current = 0;
                  setProgress(0);
                  setIsPlaying(true);
                }}
                aria-label="Rejouer depuis le début"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {cutoutSrc && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  Détourage produit
                </span>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleCutoutMode(true)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                      isCutout
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Détouré
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleCutoutMode(false)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                      !isCutout
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE : Paramètres Motion Design & Export Vidéo */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Style d'animation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              1. Modèle d’animation Motion Design
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {MOTION_PRESETS.map((item) => {
                const active = preset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPreset(item.id);
                      progressRef.current = 0;
                      setIsPlaying(true);
                    }}
                    className={`relative rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      active
                        ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="font-display text-sm font-bold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Format, Durée & Couleur */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Format vidéo
                </span>
                <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      { id: "story-9-16", label: "Story 9:16" },
                      { id: "square-1-1", label: "Carré 1:1" },
                    ] as const
                  ).map((fmt) => {
                    const active = format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormat(fmt.id)}
                        className={`relative min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="video-format-pill"
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

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Durée de la boucle
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                  {([5, 8, 12] as const).map((sec) => {
                    const active = durationSec === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setDurationSec(sec);
                          progressRef.current = 0;
                        }}
                        className={`relative min-h-[38px] rounded-lg px-2 py-1.5 font-mono text-xs font-semibold cursor-pointer ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="video-duration-pill"
                            transition={{
                              type: "spring",
                              stiffness: 450,
                              damping: 35,
                            }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{sec}s</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Qualité d'image (Résolution) & Fluidité (FPS) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Qualité d’image vidéo
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      { id: "sd", label: "Standard" },
                      { id: "hd", label: "HD" },
                      { id: "fullhd", label: "Full HD" },
                    ] as const
                  ).map((q) => {
                    const active = quality === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuality(q.id)}
                        className={`relative min-h-[38px] rounded-lg px-2 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="video-quality-pill"
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
                <p className="mt-1 text-[11px] font-mono text-slate-400 tabular-nums">
                  Résolution : {exportDims.width} × {exportDims.height} px
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Fréquence (FPS)
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                  {([24, 30, 60] as const).map((rate) => {
                    const active = fps === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={`relative min-h-[38px] rounded-lg px-2 py-1.5 font-mono text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          active ? "text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="video-fps-pill"
                            transition={{
                              type: "spring",
                              stiffness: 450,
                              damping: 35,
                            }}
                            className="absolute inset-0 rounded-lg bg-white shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{rate} FPS</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {fps === 60
                    ? "Fluidité maximale pour TikTok & Reels"
                    : fps === 24
                      ? "Rendu cinéma léger"
                      : "Standard réseaux sociaux"}
                </p>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                Couleur dominante
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {THEME_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Couleur ${hex}`}
                    onClick={() => setThemeColor(hex)}
                    className={`h-8 w-8 rounded-full border transition-transform cursor-pointer ${
                      themeColor.toLowerCase() === hex.toLowerCase()
                        ? "scale-110 ring-2 ring-slate-900 ring-offset-2 border-white"
                        : "border-slate-200 hover:scale-105"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 text-xs font-mono text-slate-700 cursor-pointer">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-slate-300"
                    style={{ backgroundColor: themeColor }}
                  />
                  <span>{themeColor.toUpperCase()}</span>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 3. Textes cinétiques de la vidéo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">
              2. Textes animés de la vidéo
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Titre principal
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Sneakers Air Pulse"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Prix affiché (USD)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="ex: $49.00 USD"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Badge promo
                </label>
                <input
                  type="text"
                  maxLength={28}
                  value={promoBadge}
                  onChange={(e) => setPromoBadge(e.target.value)}
                  placeholder="ex: -20 % · OFFRE FLASH"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Bouton d’appel à l’action (CTA)
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="ex: Commandez maintenant"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-800"
            >
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Barre d'export HD */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
            {isExporting && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
                  <span>Enregistrement de la vidéo Motion Design...</span>
                  <span className="font-mono tabular-nums">{exportPercent}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all duration-150"
                    style={{ width: `${exportPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                disabled={isExporting || isRemovingBg}
                whileTap={{ scale: 0.985 }}
                onClick={() => void handleExportVideo()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-display text-sm font-bold text-white hover:bg-indigo-400 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>
                  {isExporting
                    ? `Export en cours (${exportPercent}%)`
                    : `Enregistrer · ${qualityDisplayName} ${fps} FPS`}
                </span>
              </motion.button>

              <motion.button
                type="button"
                disabled={isExporting || isRemovingBg}
                whileTap={{ scale: 0.985 }}
                onClick={() => void handleShareVideo()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" />
                <span>Partager sur TikTok / WhatsApp</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
