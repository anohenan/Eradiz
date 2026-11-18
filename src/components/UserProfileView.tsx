import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  exportImageVariant,
  renderAllAdPosters,
} from "../services/adCanvasRenderer";
import type { SavedCreation } from "../services/userCreationsService";
import type { RecordUsageInput, UsageRecord } from "../services/userCreditsService";
import type {
  AdTemplateId,
  ImageExportFormat,
  ImageExportQuality,
} from "../types/eradiz";
import type { NavbarUserInfo } from "./Navbar";

export type ProfileTabId = "creations" | "account";

interface UserProfileViewProps {
  initialTab?: ProfileTabId;
  user: NavbarUserInfo | null;
  isFirebaseMode: boolean;
  credits: number;
  activePlan: string;
  creations: SavedCreation[];
  creationsLoading: boolean;
  usages: UsageRecord[];
  onStartStudio: () => void;
  onOpenPricing: () => void;
  onOpenLegal: () => void;
  onSignOut: () => void;
  onDeleteCreation: (creationId: string) => Promise<void>;
  onOpenCreationInVideo: (creation: SavedCreation) => void;
  onRecordUsage?: (usage: RecordUsageInput) => void;
}

const ACTION_TYPE_LABELS: Record<UsageRecord["actionType"], string> = {
  ai_studio_kit: "Studio IA",
  video_export: "Vidéo Motion",
  image_export: "Affiche HD",
  calculator_session: "Pertes & Bénéfices",
};

const POSTER_META: {
  id: AdTemplateId;
  title: string;
  ratio: string;
  thumbKey: "thumbFlashSale" | "thumbMinimalStudio" | "thumbStoryWhatsapp";
  isVertical: boolean;
}[] = [
  {
    id: "flash-sale",
    title: "Flash Sale",
    ratio: "1:1",
    thumbKey: "thumbFlashSale",
    isVertical: false,
  },
  {
    id: "minimal-studio",
    title: "Minimaliste Studio",
    ratio: "1:1",
    thumbKey: "thumbMinimalStudio",
    isVertical: false,
  },
  {
    id: "story-whatsapp",
    title: "Statut WhatsApp",
    ratio: "9:16",
    thumbKey: "thumbStoryWhatsapp",
    isVertical: true,
  },
];

function formatDateFr(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "À l'instant";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function UserProfileView({
  initialTab = "creations",
  user,
  isFirebaseMode,
  credits,
  activePlan,
  creations,
  creationsLoading,
  usages,
  onStartStudio,
  onOpenPricing,
  onOpenLegal,
  onSignOut,
  onDeleteCreation,
  onOpenCreationInVideo,
  onRecordUsage,
}: UserProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageQuality, setImageQuality] = useState<ImageExportQuality>("hd");
  const [imageFormat, setImageFormat] = useState<ImageExportFormat>("png");
  const [busyPosterKey, setBusyPosterKey] = useState<string | null>(null);
  const [busyAllId, setBusyAllId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const filteredCreations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return creations;
    return creations.filter(
      (item) =>
        item.shortPosterTitle.toLowerCase().includes(q) ||
        item.detectedCategory.toLowerCase().includes(q) ||
        item.seoTitle.toLowerCase().includes(q)
    );
  }, [creations, searchQuery]);

  const userInitial = (
    user?.displayName?.trim()?.[0] ||
    user?.email?.trim()?.[0] ||
    "E"
  ).toUpperCase();

  const handleRedownloadPoster = async (
    creation: SavedCreation,
    posterId: AdTemplateId,
    posterTitle: string,
    fallbackThumb: string
  ) => {
    const opKey = `${creation.id}:${posterId}`;
    setBusyPosterKey(opKey);
    try {
      const slug =
        creation.shortPosterTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "eradiz-affiche";
      const qTag =
        imageQuality === "ultra" ? "2k" : imageQuality === "web" ? "720p" : "hd";

      const renderedList = await renderAllAdPosters({
        imageSrc: creation.productImageSrc || fallbackThumb,
        shortTitle: creation.shortPosterTitle,
        price: creation.price,
        promoBadge: creation.promoBadge,
        themeColor: creation.themeColor,
        isCutout: creation.isCutout,
      });

      const targetPoster = renderedList.find((p) => p.id === posterId);
      if (targetPoster) {
        const exported = await exportImageVariant(
          targetPoster.dataUrl,
          targetPoster.width,
          targetPoster.height,
          imageQuality,
          imageFormat
        );
        triggerDownload(
          exported.dataUrl,
          `${slug}-${posterId}-${qTag}.${exported.extension}`
        );
        onRecordUsage?.({
          actionType: "image_export",
          title: `${creation.shortPosterTitle} (${posterTitle})`,
          details: `Retéléchargement · ${exported.width}x${exported.height} · ${exported.extension.toUpperCase()}`,
        });
        setDownloadFeedback({
          id: creation.id,
          message: `${posterTitle} retéléchargée (${exported.width}×${exported.height} · ${exported.extension.toUpperCase()})`,
        });
      } else {
        triggerDownload(fallbackThumb, `${slug}-${posterId}.webp`);
      }
    } catch {
      triggerDownload(fallbackThumb, `eradiz-${posterId}.webp`);
      setDownloadFeedback({
        id: creation.id,
        message: `${posterTitle} téléchargée`,
      });
    } finally {
      setBusyPosterKey(null);
      window.setTimeout(() => {
        setDownloadFeedback((cur) => (cur?.id === creation.id ? null : cur));
      }, 2800);
    }
  };

  const handleRedownloadAll = async (creation: SavedCreation) => {
    setBusyAllId(creation.id);
    try {
      const slug =
        creation.shortPosterTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "eradiz-affiche";
      const qTag =
        imageQuality === "ultra" ? "2k" : imageQuality === "web" ? "720p" : "hd";

      const renderedList = await renderAllAdPosters({
        imageSrc: creation.productImageSrc || creation.thumbFlashSale,
        shortTitle: creation.shortPosterTitle,
        price: creation.price,
        promoBadge: creation.promoBadge,
        themeColor: creation.themeColor,
        isCutout: creation.isCutout,
      });

      for (const poster of renderedList) {
        const exported = await exportImageVariant(
          poster.dataUrl,
          poster.width,
          poster.height,
          imageQuality,
          imageFormat
        );
        triggerDownload(
          exported.dataUrl,
          `${slug}-${poster.id}-${qTag}.${exported.extension}`
        );
      }

      onRecordUsage?.({
        actionType: "image_export",
        title: `${creation.shortPosterTitle} (Pack 3 affiches)`,
        details: `Retéléchargement complet · ${qTag.toUpperCase()} · ${imageFormat.toUpperCase()}`,
      });
      setDownloadFeedback({
        id: creation.id,
        message: "Les 3 affiches ont été retéléchargées.",
      });
    } catch {
      triggerDownload(creation.thumbFlashSale, "eradiz-flash-sale.webp");
      triggerDownload(creation.thumbMinimalStudio, "eradiz-minimal-studio.webp");
      triggerDownload(creation.thumbStoryWhatsapp, "eradiz-story-whatsapp.webp");
    } finally {
      setBusyAllId(null);
      window.setTimeout(() => {
        setDownloadFeedback((cur) => (cur?.id === creation.id ? null : cur));
      }, 3000);
    }
  };

  const handleCopyCopywriting = async (creation: SavedCreation) => {
    const fullText = [creation.seoTitle, "", creation.socialShortDesc]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      const area = document.createElement("textarea");
      area.value = fullText;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiedId(creation.id);
    window.setTimeout(() => {
      setCopiedId((cur) => (cur === creation.id ? null : cur));
    }, 2000);
  };

  const handleDelete = async (creationId: string) => {
    setDeletingId(creationId);
    try {
      await onDeleteCreation(creationId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* En-tête Profil Utilisateur */}
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || user.email}
              referrerPolicy="no-referrer"
              className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 font-display text-xl font-extrabold text-white">
              {userInitial}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {user?.displayName || "Profil Eradiz"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
              {user?.email && <span className="truncate">{user.email}</span>}
              {user?.email && <span aria-hidden="true">·</span>}
              <span>Formule : {activePlan}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-indigo-600 tabular-nums">
                {credits} {credits > 1 ? "crédits" : "crédit"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onStartStudio}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wand2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Nouvelle création</span>
          </button>
          <button
            type="button"
            onClick={onOpenPricing}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden="true" />
            <span>Recharger mes crédits</span>
          </button>
        </div>
      </div>

      {/* Onglets du Profil Utilisateur */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Sections du profil utilisateur"
          className="inline-flex items-center rounded-xl bg-slate-100 p-1 self-start"
        >
          {(
            [
              {
                id: "creations",
                label: `Mes créations (${creations.length})`,
                icon: ImageIcon,
              },
              {
                id: "account",
                label: "Compte & Utilisations",
                icon: UserIcon,
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex min-h-[40px] items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="profile-section-tab"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-xs"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "creations" && creations.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              aria-label="Rechercher dans mes créations"
              className="min-h-[40px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
            />
          </div>
        )}
      </div>

      {/* CONTENU DES ONGLETS */}
      <AnimatePresence mode="wait">
        {activeTab === "creations" ? (
          <motion.div
            key="tab-creations"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 space-y-6"
          >
            {/* Barre Qualité & Format de retéléchargement */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-700">
                    Qualité de retéléchargement
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
                              layoutId="profile-img-quality-pill"
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
                    Format d’export
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
                              layoutId="profile-img-format-pill"
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

            {/* Liste des créations sauvegardées */}
            {creationsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : creations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
                  Aucune création enregistrée pour le moment
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                  Générez votre premier kit produit dans le Studio Eradiz : vos 3
                  affiches publicitaires seront automatiquement archivées ici
                  pour être consultées et retéléchargées à tout moment.
                </p>
                <button
                  type="button"
                  onClick={onStartStudio}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  <span>Créer ma première affiche</span>
                </button>
              </div>
            ) : filteredCreations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Aucune création ne correspond à « {searchQuery} ».
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCreations.map((creation) => {
                  const qualityTag =
                    imageQuality === "ultra"
                      ? "2K"
                      : imageQuality === "web"
                        ? "Web"
                        : "HD";
                  const formatTag =
                    imageFormat === "jpeg" ? "JPG" : imageFormat.toUpperCase();
                  const isBusyAll = busyAllId === creation.id;
                  const isDeleting = deletingId === creation.id;
                  const isCopied = copiedId === creation.id;
                  const feedbackMsg =
                    downloadFeedback?.id === creation.id
                      ? downloadFeedback.message
                      : null;

                  return (
                    <article
                      key={creation.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                    >
                      {/* En-tête création + actions */}
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-slate-200 shrink-0"
                              style={{ backgroundColor: creation.themeColor }}
                              aria-hidden="true"
                            />
                            <span className="font-semibold text-indigo-600">
                              {creation.detectedCategory || "Produit Eradiz"}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {creation.isCutout
                                ? "Détourage transparent"
                                : "Photo originale"}
                            </span>
                            {creation.price && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-slate-700 tabular-nums">
                                  {creation.price}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatDateFr(creation.createdAt)}
                            </span>
                          </div>
                          <h2 className="mt-1 truncate font-display text-lg sm:text-xl font-bold text-slate-900">
                            {creation.shortPosterTitle}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isBusyAll || isDeleting}
                            onClick={() => void handleRedownloadAll(creation)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                          >
                            {isBusyAll ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span>
                              Tout retélécharger ({qualityTag} {formatTag})
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenCreationInVideo(creation)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Film className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                            <span>Vidéo Motion</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopyCopywriting(creation)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Texte copié</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Copier texte</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => void handleDelete(creation.id)}
                            aria-label={`Supprimer ${creation.shortPosterTitle}`}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {feedbackMsg && (
                        <p
                          role="status"
                          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                        >
                          {feedbackMsg}
                        </p>
                      )}

                      {/* Grille des 3 affiches générées */}
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {POSTER_META.map((poster) => {
                          const thumbSrc = creation[poster.thumbKey];
                          const opKey = `${creation.id}:${poster.id}`;
                          const isBusy = busyPosterKey === opKey;
                          return (
                            <div
                              key={poster.id}
                              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 pb-2 text-xs">
                                  <span className="font-display font-bold text-slate-900">
                                    {poster.title}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                                    {poster.ratio}
                                  </span>
                                </div>

                                <div className="flex h-52 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                  {thumbSrc ? (
                                    <img
                                      src={thumbSrc}
                                      alt={`${poster.title} — ${creation.shortPosterTitle}`}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                      <Layers className="h-6 w-6" />
                                      <span className="text-[11px]">Aperçu</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isBusy || isBusyAll}
                                onClick={() =>
                                  void handleRedownloadPoster(
                                    creation,
                                    poster.id,
                                    poster.title,
                                    thumbSrc
                                  )
                                }
                                className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                                ) : (
                                  <Download className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                                )}
                                <span>
                                  Retélécharger {qualityTag} ({formatTag})
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tab-account"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12"
          >
            {/* Colonne Informations compte */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Informations du compte
                </h2>
                <dl className="mt-4 divide-y divide-slate-100 text-sm">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Nom affiché</dt>
                    <dd className="font-semibold text-slate-900 truncate">
                      {user?.displayName || "Compte Eradiz"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Adresse e-mail</dt>
                    <dd className="font-medium text-slate-900 truncate">
                      {user?.email || "Mode local"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Formule active</dt>
                    <dd className="font-semibold text-indigo-600">
                      {activePlan}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Solde actuel</dt>
                    <dd className="font-mono font-bold text-slate-900 tabular-nums">
                      {credits} {credits > 1 ? "crédits" : "crédit"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-slate-500">Créations archivées</dt>
                    <dd className="font-mono font-bold text-slate-900 tabular-nums">
                      {creations.length}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onOpenPricing}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    <span>Gérer mon abonnement ou mes packs</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenLegal}
                    className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                    <span>Confidentialité &amp; Conditions d’utilisation</span>
                  </button>

                  {isFirebaseMode && (
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Se déconnecter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Colonne Historique des utilisations enregistrées */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Historique des utilisations enregistrées
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Synchronisé en temps réel avec votre compte Eradiz.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-indigo-600 tabular-nums">
                    {usages.length} {usages.length > 1 ? "actions" : "action"}
                  </span>
                </div>

                {usages.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-6 text-center text-xs sm:text-sm text-slate-500">
                    Aucune utilisation enregistrée pour l’instant. Lancez une
                    génération dans le Studio ou exportez une affiche pour voir
                    votre historique apparaître ici.
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {usages.map((usage) => (
                      <li
                        key={usage.id}
                        className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {usage.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium text-indigo-600">
                              {ACTION_TYPE_LABELS[usage.actionType]}
                            </span>
                            {usage.details && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{usage.details}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          <span>{formatDateFr(usage.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
