import { useState } from "react";
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  Film,
  Layers,
  MoveHorizontal,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PricingTab } from "../types/eradiz";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "./PricingModal";
import { PWAInstallButton } from "./PwaControls";
import apresProduitStudioImg from "../assets/images/apres_produit_studio_1794674948551.jpg";
import avantProduitBrutImg from "../assets/images/avant_produit_brut_1794674949160.jpg";

interface LandingPageProps {
  credits: number;
  onStartStudio: () => void;
  onOpenVideoStudio: () => void;
  onOpenCalculator: () => void;
  onOpenPricing: (tab?: PricingTab) => void;
}

const FAQ_ITEMS = [
  {
    question: "Comment Eradiz fonctionne-t-il sur mon téléphone ?",
    answer:
      "Ouvrez Eradiz depuis Chrome ou Safari (ou installez l'application Android/iOS directement sur votre écran d'accueil). Prenez une photo avec votre caméra ou sélectionnez-la dans votre galerie : le détourage s'exécute directement sur votre téléphone et l'affiche HD est prête en quelques secondes.",
  },
  {
    question: "Quels formats d'export sont inclus pour mes ventes ?",
    answer:
      "Chaque génération vous donne votre image détourée en PNG transparent, votre fiche texte SEO complète, ainsi que 3 affiches publicitaires en haute définition (PNG) : Carré 1:1 (Flash Sale & Minimaliste Studio pour Instagram/Shopify) et Vertical 9:16 (Statut WhatsApp & Story TikTok).",
  },
  {
    question: "Quelle est la différence entre les Packs et les Abonnements mensuels ?",
    answer:
      "Les Packs Starter ($12 USD pour 50 crédits) et Pro Boutiques ($29 USD pour 200 crédits) sont des achats uniques sans date d'expiration. Les Abonnements mensuels ($9, $24 ou $49 USD / mois) vous offrent plus de crédits chaque mois à tarif préférentiel et restent résiliables en 1 clic.",
  },
  {
    question:
      "Que faire si ma connexion est lente ou si le détourage bloque sur un mobile ancien ?",
    answer:
      "Le studio intègre une bascule instantanée « Avec détourage / Photo originale ». Même sur un réseau faible, vos visuels publicitaires et vos textes commerciaux restent exploitables sans perdre votre génération.",
  },
];

const TESTIMONIALS = [
  {
    id: "nadia",
    name: "Nadia Benali",
    initials: "NB",
    role: "Fondatrice · Maison Kenza",
    channel: "Instagram & WhatsApp Business",
    rating: 5,
    quote:
      "Je photographie mes sacs sur ma table le matin et en 10 secondes j’ai mon affiche carrée et ma story 9:16 prêtes à poster. Mes clientes me demandent quel studio fait mes visuels.",
  },
  {
    id: "cedric",
    name: "Cédric Morel",
    initials: "CM",
    role: "Gérant · UrbanStep Store",
    channel: "Boutique Shopify",
    rating: 5,
    quote:
      "Le détourage propre combiné à la fiche SEO et aux 10 hashtags m’a fait gagner des heures sur chaque arrivage de sneakers. Le calculateur USD m’évite aussi de vendre à perte en promo.",
  },
  {
    id: "fatoumata",
    name: "Fatoumata Diallo",
    initials: "FD",
    role: "Vendeuse e-commerce",
    channel: "TikTok Shop & Statuts WhatsApp",
    rating: 5,
    quote:
      "Tout fonctionne directement depuis mon téléphone, même quand je suis en déplacement. Je partage mes visuels et vidéos Motion en un appui et mon taux de réponse a doublé.",
  },
];

const HERO_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingPage({
  credits,
  onStartStudio,
  onOpenVideoStudio,
  onOpenCalculator,
  onOpenPricing,
}: LandingPageProps) {
  const [sliderPos, setSliderPos] = useState(55);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div>
      {/* 1. SECTION HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          {/* Texte Hero avec entrée Motion épurée */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: HERO_EASE }}
            className="lg:col-span-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Eradiz · Effacez le fond, boostez vos ventes
            </p>
            <h1
              className="mt-3 font-display font-extrabold tracking-tight text-slate-900 text-balance"
              style={{
                fontSize: "clamp(2rem, 3.8vw, 3.25rem)",
                lineHeight: 1.08,
              }}
            >
              Transformez une simple photo téléphone en fiche produit et affiche
              pub pro en 10 secondes.
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl">
              Conçu pour les e-commerçants et vendeurs sur WhatsApp, Instagram,
              TikTok et Shopify. Détourez vos articles, générez vos descriptions
              SEO et pilotez vos bénéfices en USD.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartStudio}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3.5 font-display text-sm sm:text-base font-bold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                <span>
                  {credits > 0
                    ? `Essayer gratuitement (${credits} ${
                        credits > 1 ? "crédits offerts" : "crédit offert"
                      })`
                    : "Ouvrir le Studio Eradiz"}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onOpenVideoStudio}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Film className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden="true" />
                <span>Studio Vidéo Motion</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onOpenCalculator}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Calculator className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden="true" />
                <span>Pertes &amp; Bénéfices</span>
              </motion.button>

              <PWAInstallButton />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
              <span>Sans carte bancaire</span>
              <span aria-hidden="true">·</span>
              <span>Export PNG HD sans filigrane</span>
              <span aria-hidden="true">·</span>
              <span>Packs sans expiration ou abonnements mensuels</span>
            </div>
          </motion.div>

          {/* Aperçu visuel interactif Avant / Après avec Motion */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: HERO_EASE }}
            className="lg:col-span-6"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 pb-3 text-xs font-semibold text-slate-600">
                <span>Aperçu interactif Avant / Après</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSliderPos(12)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      sliderPos <= 25
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Avant
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPos(55)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      sliderPos > 25 && sliderPos < 75
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    50 / 50
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPos(92)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      sliderPos >= 75
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Après
                  </button>
                </div>
              </div>

              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none">
                {/* COUCHE APRÈS (Affiche Promo Studio Eradiz) */}
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-700 to-indigo-500 p-5 sm:p-7">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-white px-4 py-1 font-display text-xs sm:text-sm font-extrabold tracking-wide text-indigo-700 shadow-sm">
                      -20 % · OFFRE FLASH
                    </span>
                  </div>

                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative mx-auto flex h-[56%] w-[78%] items-center justify-center rounded-2xl bg-white/95 p-3 shadow-2xl"
                  >
                    <img
                      src={apresProduitStudioImg}
                      alt="Produit isolé sur fond studio Eradiz"
                      className="h-full w-full object-contain"
                    />
                  </motion.div>

                  <div className="text-center">
                    <p className="font-display text-lg sm:text-2xl font-extrabold text-white">
                      Sneakers Air Pulse
                    </p>
                    <div className="mt-2 inline-block rounded-xl bg-slate-950 px-4 py-1.5 font-mono text-sm sm:text-base font-bold text-white border border-white/20 tabular-nums">
                      $25.00 USD
                    </div>
                  </div>
                </div>

                {/* COUCHE AVANT */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                  }}
                >
                  <img
                    src={avantProduitBrutImg}
                    alt="Photo brute prise au téléphone sur une table"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Ligne de séparation */}
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-md"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -left-4 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg">
                    <MoveHorizontal className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  aria-label="Comparer la photo brute et l'affiche Eradiz"
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>

              <p className="mt-2.5 text-center text-xs text-slate-500">
                Glissez le curseur pour comparer la photo brute et l’affiche
                générée par Eradiz.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 1B. PREUVE SOCIALE : TÉMOIGNAGES CLIENTS & AVIS ÉTOILÉS */}
      <section
        aria-labelledby="testimonials-heading"
        className="border-t border-slate-200 bg-slate-50/70 py-12 lg:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <div
                  className="flex items-center gap-0.5 text-amber-500"
                  aria-label="Note moyenne de 4,9 sur 5"
                >
                  {Array.from({ length: 5 }).map((_, starIdx) => (
                    <Star
                      key={starIdx}
                      className="h-4 w-4 fill-amber-400 text-amber-500"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  4,9 / 5
                </span>
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-600">
                  Adopté par +1 200 boutiques et vendeurs sociaux
                </span>
              </div>
              <h2
                id="testimonials-heading"
                className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
              >
                Ils transforment leurs photos téléphone en ventes
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Avis vérifiés d’utilisateurs actifs sur WhatsApp, Instagram, TikTok &amp; Shopify
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: "some" }}
                transition={{
                  duration: 0.28,
                  delay: idx * 0.06,
                  ease: HERO_EASE,
                }}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="flex items-center gap-1"
                      aria-label={`${item.rating} étoiles sur 5`}
                    >
                      {Array.from({ length: item.rating }).map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          className="h-4 w-4 fill-amber-400 text-amber-500"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600">
                      {item.channel}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-700">
                    « {item.quote} »
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-display text-xs font-bold text-indigo-700 border border-indigo-100"
                  >
                    {item.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-slate-900">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.role}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* 2. COMMENT ÇA MARCHE (3 ÉTAPES) */}
      <section className="border-t border-slate-200 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Comment ça marche en 3 étapes
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Aucun logiciel complexe ni graphiste requis : tout se fait depuis
              votre smartphone.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                num: "01.",
                title: "Prenez ou importez une photo",
                desc: "Capturez votre produit avec la caméra de votre téléphone ou importez une image depuis votre galerie (JPG, PNG, WebP).",
              },
              {
                num: "02.",
                title: "Eradiz détourne le produit et rédige les textes IA",
                desc: "Le fond est effacé localement dans votre navigateur pendant que l’IA rédige votre titre SEO, l’accroche WhatsApp/Instagram et 10 hashtags.",
              },
              {
                num: "03.",
                title: "Téléchargez et partagez",
                desc: "Exportez vos 3 affiches HD en PNG ou partagez-les directement en un appui vers WhatsApp, Instagram, TikTok ou votre boutique.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: "some" }}
                transition={{ duration: 0.28, delay: i * 0.06, ease: HERO_EASE }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 transition-shadow hover:shadow-sm"
              >
                <span className="font-mono text-xs font-bold text-indigo-600 tabular-nums">
                  {step.num}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FONCTIONNALITÉS CLÉS */}
      <section className="border-t border-slate-200 bg-slate-50 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Tout ce dont un vendeur a besoin pour convertir
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{ duration: 0.28, ease: HERO_EASE }}
              whileHover={{ y: -2 }}
              className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Layers className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
                Détourage automatique instantané
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Suppression d’arrière-plan exécutée directement sur votre
                appareil en PNG transparent, avec bascule instantanée vers la
                photo originale si besoin.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{ duration: 0.28, delay: 0.06, ease: HERO_EASE }}
              whileHover={{ y: -2 }}
              className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
                Rédaction SEO &amp; Réseaux Sociaux
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                L’analyse visuelle génère un titre SEO optimisé, une description
                courte percutante avec emojis pour WhatsApp/Instagram, une fiche
                longue avec 4 bénéfices clients et 10 hashtags prêts à copier en
                1 clic.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{ duration: 0.3, delay: 0.1, ease: HERO_EASE }}
              className="lg:col-span-12 rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:p-8 text-white"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <Share2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                    <h3 className="mt-4 font-display text-xl font-bold">
                      Studio d’affiches PNG &amp; Vidéo Motion Design (1:1 &amp;
                      9:16)
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Trois modèles graphiques HD (Flash Sale, Minimaliste Studio,
                      Statut WhatsApp) et un générateur de vidéos Motion Design
                      animées prêtes à exporter pour TikTok, Reels et WhatsApp.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 shrink-0">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={onOpenVideoStudio}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-400 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Film className="h-4 w-4" aria-hidden="true" />
                      <span>Vidéo Motion</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={onStartStudio}
                      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Créer mes visuels</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. PACKS DE CRÉDITS & ABONNEMENTS MENSUELS (USD) */}
      <section
        id="tarifs"
        className="border-t border-slate-200 bg-white py-12 lg:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Packs de crédits &amp; Abonnements mensuels
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Achetez des crédits sans date d’expiration ou choisissez un
              abonnement mensuel à tarif avantageux en USD.
            </p>
          </div>

          {/* 4A. PACKS DE CRÉDITS (COMME AVANT) */}
          <div className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Packs de crédits (achat unique · sans expiration)
              </h3>
              <span className="text-xs font-medium text-slate-500">
                1 crédit = 1 détourage + fiche SEO + 3 affiches HD
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Découverte (Gratuit) */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6"
              >
                <div>
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-display text-lg font-bold text-slate-900">
                      Découverte
                    </h4>
                    <span className="font-mono text-xs font-semibold text-indigo-600 tabular-nums">
                      3 crédits offerts
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Pour tester sur vos premiers produits
                  </p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                      $0
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      USD
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2.5 border-t border-slate-200 pt-4 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>3 crédits offerts dès l’ouverture</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>9 affiches HD sans filigrane</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>Calculateur Pertes &amp; Bénéfices inclus</span>
                    </li>
                  </ul>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={onStartStudio}
                  className="mt-6 min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Essayer gratuitement
                </motion.button>
              </motion.div>

              {/* Pack Starter & Pack Pro Boutiques */}
              {CREDIT_PACKS.map((pack) => (
                <motion.div
                  key={pack.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  className={`flex flex-col justify-between rounded-2xl border p-6 ${
                    pack.highlighted
                      ? "border-indigo-600 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-display text-lg font-bold">
                        {pack.name}
                      </h4>
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          pack.highlighted ? "text-indigo-300" : "text-indigo-600"
                        }`}
                      >
                        {pack.credits} crédits
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        pack.highlighted ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {pack.audience}
                    </p>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-extrabold tabular-nums">
                        ${pack.priceUsd}
                      </span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          pack.highlighted ? "text-indigo-200" : "text-slate-500"
                        }`}
                      >
                        USD · achat unique
                      </span>
                    </div>
                    <ul
                      className={`mt-5 space-y-2.5 border-t pt-4 text-sm ${
                        pack.highlighted
                          ? "border-white/10 text-slate-100"
                          : "border-slate-100 text-slate-700"
                      }`}
                    >
                      {pack.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check
                            className={`h-4 w-4 shrink-0 mt-0.5 ${
                              pack.highlighted
                                ? "text-indigo-400"
                                : "text-indigo-600"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenPricing("packs")}
                    className={`mt-6 min-h-[46px] w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                      pack.highlighted
                        ? "bg-indigo-500 text-white hover:bg-indigo-400"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Choisir {pack.name.replace("Pack ", "")} · ${pack.priceUsd} USD
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 4B. PLANS D'ABONNEMENTS MENSUELS */}
          <div className="mt-12 border-t border-slate-200 pt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Abonnements mensuels
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600">
                  Plus de crédits chaque mois à tarif réduit. Résiliable en 1
                  clic à tout moment.
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Jusqu’à +25 % de crédits offerts vs Packs
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: "some" }}
                  transition={{ duration: 0.25, delay: idx * 0.05, ease: HERO_EASE }}
                  whileHover={{ y: -3 }}
                  className={`flex flex-col justify-between rounded-2xl border p-6 ${
                    plan.highlighted
                      ? "border-indigo-600 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50/60 text-slate-900"
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-display text-lg font-bold">
                        {plan.name}
                      </h4>
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          plan.highlighted ? "text-indigo-300" : "text-indigo-600"
                        }`}
                      >
                        {plan.creditsPerMonth} crédits / mois
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        plan.highlighted ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {plan.audience}
                    </p>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-extrabold tabular-nums">
                        ${plan.monthlyPriceUsd}
                      </span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          plan.highlighted ? "text-indigo-200" : "text-slate-500"
                        }`}
                      >
                        USD / mois
                      </span>
                    </div>
                    <ul
                      className={`mt-5 space-y-2.5 border-t pt-4 text-sm ${
                        plan.highlighted
                          ? "border-white/10 text-slate-100"
                          : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check
                            className={`h-4 w-4 shrink-0 mt-0.5 ${
                              plan.highlighted
                                ? "text-indigo-400"
                                : "text-indigo-600"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenPricing("subscriptions")}
                    className={`mt-6 min-h-[46px] w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                      plan.highlighted
                        ? "bg-indigo-500 text-white hover:bg-indigo-400"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    S’abonner · ${plan.monthlyPriceUsd} / mois
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ avec accordéon animé */}
      <section className="border-t border-slate-200 bg-slate-50 py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Questions fréquentes
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.question}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-sm sm:text-base font-bold text-slate-900 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: HERO_EASE }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
