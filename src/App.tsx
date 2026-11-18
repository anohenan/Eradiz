import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Info } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AuthGateView } from "./components/AuthGateView";
import { AuthModal, type AuthModalTab } from "./components/AuthModal";
import { EradizLogo } from "./components/EradizLogo";
import { GenerationProgress } from "./components/GenerationProgress";
import { LandingPage } from "./components/LandingPage";
import { LegalPage, type LegalTab } from "./components/LegalPage";
import { MobileBottomNav, type AppView } from "./components/MobileBottomNav";
import { MotionVideoStudio } from "./components/MotionVideoStudio";
import { Navbar, type NavbarUserInfo } from "./components/Navbar";
import { PricingModal } from "./components/PricingModal";
import { ProfitLossCalculator } from "./components/ProfitLossCalculator";
import { OfflineIndicator } from "./components/PwaControls";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { UploadHero } from "./components/UploadHero";
import { UserProfileView, type ProfileTabId } from "./components/UserProfileView";
import { renderAllAdPosters } from "./services/adCanvasRenderer";
import {
  prepareImageForProcessing,
  removeProductBackground,
  type PreparedImage,
} from "./services/backgroundRemover";
import { creditsRepository } from "./services/creditsRepository";
import { auth, isFirebaseConfigured } from "./services/firebase";
import {
  deleteUserCreation,
  getLocalCreations,
  saveUserCreation,
  subscribeToUserCreations,
  type SavedCreation,
} from "./services/userCreationsService";
import {
  addCloudCredits,
  decrementCloudCredit,
  ensureUserProfileDocument,
  INITIAL_CLOUD_CREDITS,
  recordUserUsage,
  subscribeToUserProfile,
  subscribeToUserUsages,
  type CloudUserProfile,
  type RecordUsageInput,
  type UsageRecord,
} from "./services/userCreditsService";
import type {
  AdPosterRender,
  CreditsState,
  GenerationStepState,
  PricingTab,
  ProductAnalysis,
  ToneOption,
} from "./types/eradiz";

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DEFAULT_THEME_COLOR = "#4F46E5";

function createInitialSteps(): GenerationStepState[] {
  return [
    {
      id: 1,
      label: "1. Eradiz supprime l'arrière-plan...",
      status: "active",
      detail: "Segmentation locale dans votre navigateur (coût serveur nul).",
    },
    {
      id: 2,
      label: "2. Analyse du produit par IA...",
      status: "active",
      detail: "Rédaction du titre SEO, descriptions et hashtags ciblés.",
    },
    {
      id: 3,
      label: "3. Création des affiches publicitaires...",
      status: "pending",
    },
  ];
}

const VIEW_SEO_METADATA: Record<
  AppView,
  { title: string; description: string }
> = {
  home: {
    title: "Eradiz — Studio Photo Produit IA, Détourage & Affiches HD",
    description:
      "Détourez vos photos produits en 1 clic, générez vos fiches SEO et créez 3 affiches pub HD + vidéos Motion Design. 5 crédits offerts à l'inscription.",
  },
  studio: {
    title: "Studio Eradiz — Détourage PNG, Fiche SEO & 3 Affiches Pub",
    description:
      "Importez votre photo produit pour obtenir un détourage transparent, des textes SEO optimisés et 3 affiches publicitaires prêtes à partager.",
  },
  video: {
    title: "Studio Vidéo Motion Design Produit — Eradiz",
    description:
      "Animez vos produits en vidéos Motion Design 1:1, 9:16 ou 16:9 jusqu'en 2K et 60 FPS pour TikTok, Instagram Reels et WhatsApp.",
  },
  calculator: {
    title: "Calculateur Pertes & Bénéfices E-commerce (USD) — Eradiz",
    description:
      "Simulez vos coûts publicitaires, frais de livraison et marge nette par commande en USD avant de lancer vos campagnes.",
  },
  profile: {
    title: "Mes Créations & Profil Utilisateur — Eradiz",
    description:
      "Retrouvez vos anciennes affiches générées, re-téléchargez vos visuels en Web/HD/2K et suivez vos crédits Eradiz.",
  },
  legal: {
    title: "Confidentialité & Conditions d'Utilisation — Eradiz",
    description:
      "Consultez la politique de confidentialité et les conditions générales d'utilisation du studio Eradiz.",
  },
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [legalTab, setLegalTab] = useState<LegalTab>("privacy");
  const [profileTab, setProfileTab] = useState<ProfileTabId>("creations");

  // Firebase Auth & Cloud Firestore state (with localStorage fallback)
  const [authReady, setAuthReady] = useState<boolean>(!isFirebaseConfigured);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(
    null
  );
  const [userUsages, setUserUsages] = useState<UsageRecord[]>([]);
  const [savedCreations, setSavedCreations] = useState<SavedCreation[]>(() =>
    isFirebaseConfigured ? [] : getLocalCreations()
  );
  const [creationsLoading, setCreationsLoading] = useState<boolean>(false);
  const [videoOverride, setVideoOverride] = useState<{
    imageSrc: string;
    isCutout: boolean;
    title: string;
    price: string;
    promoBadge: string;
    themeColor: string;
  } | null>(null);
  const [localCreditsState, setLocalCreditsState] = useState<CreditsState>(() =>
    creditsRepository.getState()
  );

  // Modals
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState<PricingTab>("subscriptions");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthModalTab>("register");
  const [authReasonMessage, setAuthReasonMessage] = useState<string | null>(
    null
  );

  // Studio inputs
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null);
  const [price, setPrice] = useState("");
  const [promoBadge, setPromoBadge] = useState("");
  const [tone, setTone] = useState<ToneOption>("Dynamique Réseaux Sociaux");
  const [inputError, setInputError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [cutoutProgress, setCutoutProgress] = useState(0);
  const [steps, setSteps] = useState<GenerationStepState[]>(createInitialSteps);

  // Results state
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string | null>(null);
  const [cutoutSucceeded, setCutoutSucceeded] = useState(false);
  const [useCutout, setUseCutout] = useState(true);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [posters, setPosters] = useState<AdPosterRender[]>([]);
  const [isRenderingPosters, setIsRenderingPosters] = useState(false);

  // Firebase Authentication listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        void ensureUserProfileDocument(user).catch((err) => {
          console.error("Erreur initialisation profil Firestore :", err);
        });
      } else {
        setCloudProfile(null);
        setUserUsages([]);
        setSavedCreations([]);
        setCreationsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Dynamic per-view SEO title, meta description, canonical & OpenGraph URL
  useEffect(() => {
    const meta = VIEW_SEO_METADATA[activeView];
    document.title = meta.title;

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute("content", content);
      }
    };

    setMetaTag('meta[name="description"]', meta.description);
    setMetaTag('meta[property="og:title"]', meta.title);
    setMetaTag('meta[property="og:description"]', meta.description);
    setMetaTag('meta[name="twitter:title"]', meta.title);
    setMetaTag('meta[name="twitter:description"]', meta.description);

    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);
    setMetaTag('meta[property="og:url"]', canonicalUrl);
  }, [activeView]);

  // Real-time Firestore credits, profile, usages & saved creations listener (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured || !authReady || !firebaseUser) {
      return;
    }

    setCreationsLoading(true);

    const unsubscribeProfile = subscribeToUserProfile(
      firebaseUser,
      (profile) => {
        setCloudProfile(profile);
      },
      (err) => {
        console.error("Erreur synchronisation Firestore :", err);
      }
    );

    const unsubscribeUsages = subscribeToUserUsages(
      firebaseUser.uid,
      (records) => {
        setUserUsages(records);
      },
      (err) => {
        console.error("Erreur chargement historique Firestore :", err);
      }
    );

    const unsubscribeCreations = subscribeToUserCreations(
      firebaseUser.uid,
      (items) => {
        setSavedCreations(items);
        setCreationsLoading(false);
      },
      (err) => {
        console.error("Erreur chargement créations Firestore :", err);
        setCreationsLoading(false);
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeUsages();
      unsubscribeCreations();
    };
  }, [authReady, firebaseUser]);

  const activeCredits = isFirebaseConfigured
    ? firebaseUser
      ? cloudProfile?.credits ?? 0
      : INITIAL_CLOUD_CREDITS
    : localCreditsState.balance;

  const activePlan = isFirebaseConfigured
    ? cloudProfile?.activePlan ?? "Découverte"
    : localCreditsState.activePlan;

  const navbarUser: NavbarUserInfo | null = firebaseUser
    ? {
        uid: firebaseUser.uid,
        email: cloudProfile?.email || firebaseUser.email || "",
        displayName:
          cloudProfile?.displayName || firebaseUser.displayName || "",
        photoURL: firebaseUser.photoURL,
      }
    : null;

  const openAuthModal = (
    tab: AuthModalTab = "register",
    reason: string | null = null
  ) => {
    setAuthTab(tab);
    setAuthReasonMessage(reason);
    setIsAuthOpen(true);
  };

  const openPricingModal = (tab: PricingTab = "subscriptions") => {
    setPricingTab(tab);
    setIsPricingOpen(true);
  };

  const handleRecordUsage = async (usage: RecordUsageInput) => {
    if (!isFirebaseConfigured || !firebaseUser) return;
    try {
      await recordUserUsage(firebaseUser, usage);
    } catch (err) {
      console.error("Erreur enregistrement utilisation Firestore :", err);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setCloudProfile(null);
      setUserUsages([]);
      setSavedCreations([]);
    } catch (error) {
      console.error("Erreur déconnexion :", error);
    }
  };

  const isToolView = (view: AppView) =>
    view === "studio" ||
    view === "video" ||
    view === "calculator" ||
    view === "profile";

  const navigateTo = (view: AppView) => {
    if (view !== "video") {
      setVideoOverride(null);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (
      isFirebaseConfigured &&
      authReady &&
      !firebaseUser &&
      isToolView(view)
    ) {
      openAuthModal(
        "register",
        "Inscrivez-vous gratuitement avant d’utiliser Eradiz : vos 5 crédits offerts et toutes vos utilisations sont enregistrés automatiquement."
      );
    }
  };

  const openProfile = (tab: ProfileTabId = "creations") => {
    setProfileTab(tab);
    navigateTo("profile");
  };

  const openLegalTab = (tab: LegalTab) => {
    setLegalTab(tab);
    navigateTo("legal");
  };

  const handleFileSelected = async (file: File) => {
    setInputError(null);
    const mime = file.type.toLowerCase();
    if (mime && !ACCEPTED_MIME_TYPES.has(mime)) {
      setInputError(
        "Format non pris en charge. Importez une image JPG, PNG ou WebP."
      );
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setInputError(
        "L'image dépasse 20 Mo. Veuillez choisir un fichier plus léger."
      );
      return;
    }

    try {
      const prepared = await prepareImageForProcessing(file);
      setSelectedFile(file);
      setPreparedImage(prepared);
      setAnalysis(null);
      setPosters([]);
      setCutoutDataUrl(null);
    } catch (error: unknown) {
      setInputError(
        error instanceof Error
          ? error.message
          : "Impossible de lire cette image."
      );
    }
  };

  const handleGenerate = async () => {
    if (!preparedImage || !selectedFile) {
      setInputError("Veuillez d'abord importer une photo de produit.");
      return;
    }

    // Protection anti-abus : si Firebase est actif et que l'utilisateur n'est pas connecté,
    // on ouvre la modale d'inscription/connexion pour lui attribuer ses 5 crédits cloud.
    if (isFirebaseConfigured && !firebaseUser) {
      openAuthModal(
        "register",
        "Créez votre compte gratuit ou connectez-vous pour récupérer vos 5 crédits offerts et lancer la génération."
      );
      return;
    }

    if (isFirebaseConfigured) {
      const currentCloudCredits = cloudProfile?.credits ?? 0;
      if (currentCloudCredits <= 0) {
        openPricingModal("subscriptions");
        return;
      }
    } else {
      const latestCredits = creditsRepository.getState();
      setLocalCreditsState(latestCredits);
      if (latestCredits.balance <= 0) {
        openPricingModal("packs");
        return;
      }
    }

    setInputError(null);
    setIsGenerating(true);
    setCutoutProgress(5);
    setSteps(createInitialSteps());

    try {
      const bgRemovalTask = removeProductBackground(
        preparedImage.originalDataUrl,
        (pct) => setCutoutProgress(pct)
      ).then((res) => {
        setSteps((prev) =>
          prev.map((step) =>
            step.id === 1
              ? {
                  ...step,
                  status: res.succeeded ? "done" : "fallback",
                  detail: res.succeeded
                    ? "Arrière-plan supprimé avec succès."
                    : res.errorMessage || "Bascule sur la photo originale.",
                }
              : step
          )
        );
        return res;
      });

      const aiAnalysisTask = fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preparedImage.apiBase64,
          mimeType: preparedImage.apiMimeType,
          price: price.trim(),
          promoBadge: promoBadge.trim(),
          tone,
        }),
      }).then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as
          | ProductAnalysis
          | { error?: string };
        if (!response.ok) {
          const errMsg =
            "error" in data && typeof data.error === "string"
              ? data.error
              : "L'analyse IA a échoué. Veuillez réessayer.";
          throw new Error(errMsg);
        }
        const productData = data as ProductAnalysis;
        setSteps((prev) =>
          prev.map((step) =>
            step.id === 2
              ? {
                  ...step,
                  status: "done",
                  detail: `Catégorie identifiée : ${productData.detectedCategory}`,
                }
              : step
          )
        );
        return productData;
      });

      const [bgResult, aiResult] = await Promise.all([
        bgRemovalTask,
        aiAnalysisTask,
      ]);

      setSteps((prev) =>
        prev.map((step) =>
          step.id === 3
            ? {
                ...step,
                status: "active",
                detail: "Rendu HD des formats 1:1 et 9:16...",
              }
            : step
        )
      );

      const shouldUseCutout = bgResult.succeeded;
      const activeSrc = shouldUseCutout
        ? bgResult.cutoutDataUrl
        : preparedImage.originalDataUrl;

      const renderedPosters = await renderAllAdPosters({
        imageSrc: activeSrc,
        shortTitle: aiResult.shortPosterTitle,
        price: price.trim(),
        promoBadge: promoBadge.trim(),
        themeColor,
        isCutout: shouldUseCutout,
      });

      setSteps((prev) =>
        prev.map((step) =>
          step.id === 3
            ? {
                ...step,
                status: "done",
                detail: "3 affiches PNG prêtes à télécharger.",
              }
            : step
        )
      );

      if (isFirebaseConfigured && firebaseUser) {
        await decrementCloudCredit(firebaseUser.uid);
        await handleRecordUsage({
          actionType: "ai_studio_kit",
          title: aiResult.shortPosterTitle,
          details: `${aiResult.detectedCategory} · ${tone}`,
        });
      } else {
        const updatedCredits = creditsRepository.decrementCredit();
        setLocalCreditsState(updatedCredits);
      }

      void saveUserCreation(firebaseUser, {
        analysis: aiResult,
        posters: renderedPosters,
        productImageSrc: activeSrc,
        isCutout: shouldUseCutout,
        price: price.trim(),
        promoBadge: promoBadge.trim(),
        tone,
        themeColor,
      })
        .then((saved) => {
          if (!isFirebaseConfigured && saved) {
            setSavedCreations(getLocalCreations());
          }
        })
        .catch((err) => {
          console.error("Erreur sauvegarde création :", err);
        });

      setCutoutDataUrl(bgResult.cutoutDataUrl);
      setCutoutSucceeded(bgResult.succeeded);
      setUseCutout(bgResult.succeeded);
      setAnalysis(aiResult);
      setPosters(renderedPosters);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: unknown) {
      setInputError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la génération. Aucun crédit n'a été débité."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!analysis || !preparedImage || !cutoutDataUrl) return;

    let cancelled = false;
    setIsRenderingPosters(true);

    const activeCutout = useCutout && cutoutSucceeded;
    const activeSrc = activeCutout
      ? cutoutDataUrl
      : preparedImage.originalDataUrl;

    renderAllAdPosters({
      imageSrc: activeSrc,
      shortTitle: analysis.shortPosterTitle,
      price: price.trim(),
      promoBadge: promoBadge.trim(),
      themeColor,
      isCutout: activeCutout,
    })
      .then((rendered) => {
        if (!cancelled) {
          setPosters(rendered);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRenderingPosters(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    analysis,
    preparedImage,
    cutoutDataUrl,
    cutoutSucceeded,
    useCutout,
    themeColor,
    price,
    promoBadge,
  ]);

  const handleActivateDemo = async (): Promise<boolean> => {
    if (isFirebaseConfigured) {
      if (!firebaseUser) {
        setIsPricingOpen(false);
        openAuthModal(
          "login",
          "Connectez-vous pour ajouter +10 crédits (Mode Démo) sur votre compte Cloud Firestore."
        );
        return false;
      }
      await addCloudCredits(firebaseUser.uid, 10);
      setInputError(null);
      return true;
    }

    const updated = creditsRepository.addCredits(10);
    setLocalCreditsState(updated);
    setInputError(null);
    return true;
  };

  const handlePurchasePack = async (
    packName: string,
    creditsAdded: number
  ): Promise<boolean> => {
    if (isFirebaseConfigured) {
      if (!firebaseUser) {
        setIsPricingOpen(false);
        openAuthModal(
          "login",
          `Connectez-vous pour activer le ${packName} sur votre compte.`
        );
        return false;
      }
      await addCloudCredits(firebaseUser.uid, creditsAdded, packName);
      setInputError(null);
      return true;
    }

    const updated = creditsRepository.purchasePack(packName, creditsAdded);
    setLocalCreditsState(updated);
    setInputError(null);
    return true;
  };

  const handleSelectSubscription = async (
    planName: string,
    creditsAdded: number
  ): Promise<boolean> => {
    if (isFirebaseConfigured) {
      if (!firebaseUser) {
        setIsPricingOpen(false);
        openAuthModal(
          "login",
          `Connectez-vous pour activer ${planName} sur votre compte.`
        );
        return false;
      }
      await addCloudCredits(firebaseUser.uid, creditsAdded, planName);
      setInputError(null);
      return true;
    }

    const updated = creditsRepository.activateSubscription(
      planName,
      creditsAdded
    );
    setLocalCreditsState(updated);
    setInputError(null);
    return true;
  };

  const handleResetStudio = () => {
    setSelectedFile(null);
    setPreparedImage(null);
    setAnalysis(null);
    setPosters([]);
    setCutoutDataUrl(null);
    setCutoutSucceeded(false);
    setUseCutout(true);
    setInputError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearLocalData = () => {
    const resetState = creditsRepository.resetLocalData();
    setLocalCreditsState(resetState);
  };

  const hasResults = Boolean(
    analysis && posters.length > 0 && preparedImage && cutoutDataUrl
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
        <Navbar
          activeView={activeView}
          isFirebaseMode={isFirebaseConfigured}
          authReady={authReady}
          user={navbarUser}
          credits={activeCredits}
          activePlan={activePlan}
          creationsCount={savedCreations.length}
          recentUsages={userUsages}
          onNavigate={navigateTo}
          onOpenProfile={openProfile}
          onOpenPricing={() => openPricingModal("subscriptions")}
          onOpenAuth={(tab) => openAuthModal(tab ?? "register")}
          onSignOut={() => void handleSignOut()}
        />

        {/* Bandeau discret si les variables Firebase sont absentes (Mode Secours localStorage) */}
        {!isFirebaseConfigured && (
          <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900">
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                Mode prévisualisation locale (localStorage) : renseignez vos
                variables <code className="font-mono">VITE_FIREBASE_*</code> pour
                activer le cloud.
              </span>
            </span>
          </div>
        )}

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeView === "home" && (
                <LandingPage
                  credits={activeCredits}
                  onStartStudio={() => navigateTo("studio")}
                  onOpenVideoStudio={() => navigateTo("video")}
                  onOpenCalculator={() => navigateTo("calculator")}
                  onOpenPricing={(tab) =>
                    openPricingModal(tab ?? "subscriptions")
                  }
                />
              )}

              {isToolView(activeView) && isFirebaseConfigured && !authReady && (
                <div className="mx-auto max-w-3xl px-4 py-16">
                  <div className="h-64 rounded-3xl border border-slate-200 bg-white animate-pulse" />
                </div>
              )}

              {isToolView(activeView) &&
                isFirebaseConfigured &&
                authReady &&
                !firebaseUser && (
                  <AuthGateView
                    targetLabel={
                      activeView === "video"
                        ? "Studio Vidéo Motion"
                        : activeView === "calculator"
                          ? "Pertes & Bénéfices USD"
                          : activeView === "profile"
                            ? "Profil & Mes créations"
                            : "Studio Eradiz"
                    }
                    onRegister={() =>
                      openAuthModal(
                        "register",
                        "Inscrivez-vous gratuitement avant d’utiliser Eradiz : vos 5 crédits offerts et toutes vos utilisations sont enregistrés automatiquement."
                      )
                    }
                    onLogin={() => openAuthModal("login")}
                    onBackHome={() => navigateTo("home")}
                  />
                )}

              {activeView === "studio" &&
                (!isFirebaseConfigured || (authReady && firebaseUser)) && (
                <>
                  {isGenerating ? (
                    <GenerationProgress
                      steps={steps}
                      cutoutProgress={cutoutProgress}
                    />
                  ) : hasResults && analysis && preparedImage && cutoutDataUrl ? (
                    <ResultsDashboard
                      analysis={analysis}
                      posters={posters}
                      cutoutDataUrl={cutoutDataUrl}
                      originalDataUrl={preparedImage.originalDataUrl}
                      cutoutSucceeded={cutoutSucceeded}
                      useCutout={useCutout}
                      themeColor={themeColor}
                      isRenderingPosters={isRenderingPosters}
                      onToggleCutout={setUseCutout}
                      onThemeColorChange={setThemeColor}
                      onOpenVideoStudio={() => navigateTo("video")}
                      onOpenCalculator={() => navigateTo("calculator")}
                      onOpenProfileCreations={() => openProfile("creations")}
                      onRecordUsage={(u) => void handleRecordUsage(u)}
                      onReset={handleResetStudio}
                    />
                  ) : (
                    <UploadHero
                      selectedFile={selectedFile}
                      previewUrl={preparedImage?.originalDataUrl ?? null}
                      imageDimensions={
                        preparedImage
                          ? {
                              width: preparedImage.width,
                              height: preparedImage.height,
                            }
                          : null
                      }
                      price={price}
                      promoBadge={promoBadge}
                      tone={tone}
                      credits={activeCredits}
                      requiresAuth={isFirebaseConfigured && !firebaseUser}
                      isGenerating={isGenerating}
                      errorMessage={inputError}
                      onFileSelected={handleFileSelected}
                      onPriceChange={setPrice}
                      onPromoBadgeChange={setPromoBadge}
                      onToneChange={setTone}
                      onGenerate={() => void handleGenerate()}
                      onOpenPricing={() => openPricingModal("subscriptions")}
                    />
                  )}
                </>
              )}

              {activeView === "video" &&
                (!isFirebaseConfigured || (authReady && firebaseUser)) && (
                <MotionVideoStudio
                  initialImageSrc={
                    videoOverride?.imageSrc ??
                    (useCutout && cutoutSucceeded && cutoutDataUrl
                      ? cutoutDataUrl
                      : preparedImage?.originalDataUrl ?? null)
                  }
                  initialIsCutout={
                    videoOverride
                      ? videoOverride.isCutout
                      : preparedImage
                        ? useCutout && cutoutSucceeded
                        : true
                  }
                  initialTitle={videoOverride?.title ?? analysis?.shortPosterTitle}
                  initialPrice={videoOverride?.price ?? price}
                  initialPromoBadge={videoOverride?.promoBadge ?? promoBadge}
                  initialThemeColor={videoOverride?.themeColor ?? themeColor}
                  onGoToAiStudio={() => navigateTo("studio")}
                  onRecordUsage={(u) => void handleRecordUsage(u)}
                />
              )}

              {activeView === "calculator" &&
                (!isFirebaseConfigured || (authReady && firebaseUser)) && (
                <ProfitLossCalculator
                  studioProductTitle={analysis?.shortPosterTitle ?? null}
                  studioProductPriceText={price}
                  onRecordUsage={(u) => void handleRecordUsage(u)}
                />
              )}

              {activeView === "profile" &&
                (!isFirebaseConfigured || (authReady && firebaseUser)) && (
                <UserProfileView
                  key={profileTab}
                  initialTab={profileTab}
                  user={navbarUser}
                  isFirebaseMode={isFirebaseConfigured}
                  credits={activeCredits}
                  activePlan={activePlan}
                  creations={savedCreations}
                  creationsLoading={creationsLoading}
                  usages={userUsages}
                  onStartStudio={() => navigateTo("studio")}
                  onOpenPricing={() => openPricingModal("subscriptions")}
                  onOpenLegal={() => openLegalTab("privacy")}
                  onSignOut={() => void handleSignOut()}
                  onDeleteCreation={async (creationId) => {
                    await deleteUserCreation(
                      firebaseUser?.uid ?? null,
                      creationId
                    );
                    if (!isFirebaseConfigured) {
                      setSavedCreations(getLocalCreations());
                    }
                  }}
                  onOpenCreationInVideo={(creation) => {
                    setVideoOverride({
                      imageSrc:
                        creation.productImageSrc || creation.thumbFlashSale,
                      isCutout: creation.isCutout,
                      title: creation.shortPosterTitle,
                      price: creation.price,
                      promoBadge: creation.promoBadge,
                      themeColor: creation.themeColor,
                    });
                    setActiveView("video");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onRecordUsage={(u) => void handleRecordUsage(u)}
                />
              )}

              {activeView === "legal" && (
                <LegalPage
                  key={legalTab}
                  initialTab={legalTab}
                  onBackHome={() => navigateTo("home")}
                  onClearLocalData={handleClearLocalData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <EradizLogo
                size={22}
                showWordmark
                wordmarkClassName="font-display font-bold text-slate-900"
              />
              <span aria-hidden="true">·</span>
              <span>Effacez le fond, boostez vos ventes</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => openLegalTab("privacy")}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                Politique de Confidentialité
              </button>
              <button
                type="button"
                onClick={() => openLegalTab("terms")}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                Conditions Générales d’Utilisation
              </button>
              <button
                type="button"
                onClick={() => openPricingModal("subscriptions")}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                Abonnements &amp; Packs
              </button>
              <a
                href="/pwa-512x512.png"
                download="eradiz-logo-512.png"
                className="hover:text-slate-900 transition-colors"
              >
                Logo PNG
              </a>
              <a
                href="/icon.svg"
                download="eradiz-logo.svg"
                className="hover:text-slate-900 transition-colors"
              >
                Logo SVG
              </a>
            </div>
          </div>
        </footer>

        <MobileBottomNav
          activeView={activeView}
          onNavigate={navigateTo}
        />

        <OfflineIndicator />

        <PricingModal
          isOpen={isPricingOpen}
          initialTab={pricingTab}
          credits={activeCredits}
          activePlan={activePlan}
          isSignedIn={!isFirebaseConfigured || Boolean(firebaseUser)}
          userEmail={navbarUser?.email ?? null}
          onClose={() => setIsPricingOpen(false)}
          onRequireAuth={(reason) => {
            setIsPricingOpen(false);
            openAuthModal("login", reason);
          }}
          onActivateDemo={handleActivateDemo}
          onPurchasePack={handlePurchasePack}
          onSelectSubscription={handleSelectSubscription}
        />

        <AuthModal
          isOpen={isAuthOpen}
          initialTab={authTab}
          reasonMessage={authReasonMessage}
          onClose={() => setIsAuthOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}
