import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Gift, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type {
  PricingPack,
  PricingTab,
  SubscriptionPlan,
} from "../types/eradiz";

export const SASPAY_24_USD_PAYMENT_URL = "https://link.saspay.me/k2jpvaqepuk";

interface PricingModalProps {
  isOpen: boolean;
  initialTab?: PricingTab;
  credits: number;
  activePlan: string;
  isSignedIn?: boolean;
  userEmail?: string | null;
  onClose: () => void;
  onRequireAuth?: (reason: string) => void;
  onActivateDemo: () => Promise<boolean> | boolean | void;
  onPurchasePack: (
    packName: string,
    creditsAdded: number
  ) => Promise<boolean> | boolean | void;
  onSelectSubscription: (
    planName: string,
    creditsAdded: number
  ) => Promise<boolean> | boolean | void;
}

export const CREDIT_PACKS: PricingPack[] = [
  {
    id: "starter",
    name: "Pack Starter",
    audience: "Pour vendeurs indépendants & lancements",
    credits: 50,
    priceUsd: 12,
    features: [
      "50 fiches produits SEO + détourage local",
      "150 affiches HD (1:1 et 9:16) sans filigrane",
      "Crédits sans date d'expiration",
    ],
  },
  {
    id: "pro",
    name: "Pack Pro Boutiques",
    audience: "Pour catalogues e-commerce & marques actives",
    credits: 200,
    priceUsd: 29,
    highlighted: true,
    features: [
      "200 fiches produits SEO + détourage local",
      "600 affiches HD prêtes à publier",
      "Tous les tons (Réseaux Sociaux, Pro, Luxe)",
      "Crédits sans date d'expiration",
    ],
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "creator",
    name: "Abo Créateur",
    audience: "Idéal pour publier chaque semaine",
    creditsPerMonth: 60,
    monthlyPriceUsd: 9,
    features: [
      "60 crédits crédités chaque mois",
      "180 affiches HD (1:1 et 9:16) / mois",
      "Résiliable en 1 clic à tout moment",
    ],
  },
  {
    id: "boutique",
    name: "Abo Boutique",
    audience: "Meilleur ratio pour boutiques actives",
    creditsPerMonth: 250,
    monthlyPriceUsd: 24,
    badge: "Recommandé",
    highlighted: true,
    paymentUrl: SASPAY_24_USD_PAYMENT_URL,
    paymentNote: "Paiement unique sécurisé",
    features: [
      "250 crédits ajoutés pour votre boutique",
      "750 affiches HD prêtes à publier",
      "Tous les tons + Calculateur Pertes & Bénéfices",
      "Paiement unique $24 USD sécurisé (sans reconduction auto)",
    ],
  },
  {
    id: "agency",
    name: "Abo Agence",
    audience: "Pour gros catalogues & multi-boutiques",
    creditsPerMonth: 600,
    monthlyPriceUsd: 49,
    features: [
      "600 crédits crédités chaque mois",
      "1 800 affiches HD sans filigrane",
      "Idéal Shopify, TikTok Shop & agences",
      "Résiliable en 1 clic à tout moment",
    ],
  },
];

export function PricingModal({
  isOpen,
  initialTab = "subscriptions",
  credits,
  activePlan,
  isSignedIn = true,
  userEmail = null,
  onClose,
  onRequireAuth,
  onActivateDemo,
  onPurchasePack,
  onSelectSubscription,
}: PricingModalProps) {
  const [activeTab, setActiveTab] = useState<PricingTab>(initialTab);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
    } else {
      setFeedback(null);
      setCheckoutNotice(null);
      setCopiedEmail(false);
      setErrorMsg(null);
      setIsUpdating(false);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleDemoActivate = async () => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const ok = await onActivateDemo();
      if (ok === false) return;
      setFeedback("+10 crédits ajoutés à votre solde.");
      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setErrorMsg("Impossible de créditer votre compte pour le moment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBuyPack = async (pack: PricingPack) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const ok = await onPurchasePack(pack.name, pack.credits);
      if (ok === false) return;
      setFeedback(`${pack.name} activé : +${pack.credits} crédits ajoutés.`);
      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setErrorMsg("Impossible de finaliser l'ajout de crédits.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const ok = await onSelectSubscription(
        `${plan.name} (Mensuel)`,
        plan.creditsPerMonth
      );
      if (ok === false) return;
      setFeedback(
        `${plan.name} activé : +${plan.creditsPerMonth} crédits ajoutés pour ce mois.`
      );
      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setErrorMsg("Impossible d'activer l'abonnement pour le moment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExternalCheckoutClick = (
    label: string,
    priceUsd: number,
    creditsCount: number
  ) => {
    setErrorMsg(null);
    setFeedback(null);
    setCheckoutNotice(
      `Lien de paiement sécurisé ouvert pour ${label} ($${priceUsd} USD · ${creditsCount} crédits). Utilisez votre adresse e-mail de compte Eradiz lors du règlement pour l’attribution de vos crédits.`
    );
  };

  const handleCopyAccountEmail = async () => {
    if (!userEmail) return;
    try {
      await navigator.clipboard.writeText(userEmail);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard indisponible
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdating) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl"
          >
            <button
              type="button"
              disabled={isUpdating}
              onClick={onClose}
              aria-label="Fermer la fenêtre des tarifs"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold text-indigo-600 tabular-nums">
                <span>Formule : {activePlan}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {credits} {credits > 1 ? "crédits" : "crédit"} disponibles
                </span>
              </div>
              <h2
                id="pricing-modal-title"
                className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900"
              >
                Abonnements mensuels &amp; Packs de crédits
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                1 crédit = 1 détourage produit + 1 fiche SEO complète + 3 affiches
                publicitaires HD en USD.
              </p>

              {/* Sélecteur animé Abonnements mensuels vs Packs */}
              <div className="mt-4 inline-flex items-center rounded-xl bg-slate-100 p-1">
                {(
                  [
                    { id: "subscriptions", label: "Abonnements mensuels" },
                    { id: "packs", label: "Packs de crédits" },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? "text-slate-900"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="modal-pricing-tab"
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 35,
                          }}
                          className="absolute inset-0 rounded-lg bg-white shadow-xs"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulation / Code démo */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
              <div className="flex items-start gap-3">
                <Gift
                  className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Mode évaluation &amp; test immédiat
                  </p>
                  <p className="text-xs text-slate-600">
                    Testez l’application sans carte bancaire grâce au mode démo.
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                disabled={isUpdating}
                whileTap={{ scale: 0.97 }}
                onClick={() => void handleDemoActivate()}
                className="shrink-0 min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                Activer +10 crédits (Mode Démo)
              </motion.button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800"
              >
                {errorMsg}
              </div>
            )}

            {feedback && (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
              >
                {feedback}
              </motion.div>
            )}

            {checkoutNotice && (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs sm:text-sm text-indigo-950"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="flex-1 space-y-2">
                    <p className="font-medium leading-relaxed">
                      {checkoutNotice}
                    </p>
                    {userEmail && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs bg-white border border-indigo-200 rounded-md px-2 py-1 text-slate-800">
                          {userEmail}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleCopyAccountEmail()}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {copiedEmail ? "E-mail copié" : "Copier l’e-mail"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === "packs" ? (
                <motion.div
                  key="packs-grid"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
                >
                  {CREDIT_PACKS.map((pack) => (
                    <motion.div
                      key={pack.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                      className={`flex flex-col justify-between rounded-2xl border p-6 ${
                        pack.highlighted
                          ? "border-indigo-600 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-display text-lg font-bold">
                            {pack.name}
                          </h3>
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              pack.highlighted
                                ? "text-indigo-300"
                                : "text-indigo-600"
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
                              pack.highlighted
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            USD · achat unique
                          </span>
                        </div>

                        <ul className="mt-5 space-y-2.5 border-t border-current/10 pt-4">
                          {pack.features.map((feat) => (
                            <li
                              key={feat}
                              className="flex items-start gap-2 text-xs sm:text-sm"
                            >
                              <Check
                                className={`h-4 w-4 shrink-0 mt-0.5 ${
                                  pack.highlighted
                                    ? "text-indigo-400"
                                    : "text-indigo-600"
                                }`}
                                aria-hidden="true"
                              />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {pack.paymentUrl ? (
                        isSignedIn ? (
                          <a
                            href={pack.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              handleExternalCheckoutClick(
                                pack.name,
                                pack.priceUsd,
                                pack.credits
                              )
                            }
                            className={`mt-6 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                              pack.highlighted
                                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            <span>
                              Payer ${pack.priceUsd} USD
                            </span>
                            <ExternalLink
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              onRequireAuth?.(
                                `Connectez-vous pour payer le ${pack.name} ($${pack.priceUsd} USD) et associer les ${pack.credits} crédits à votre compte.`
                              )
                            }
                            className={`mt-6 min-h-[46px] w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                              pack.highlighted
                                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            Se connecter pour payer · ${pack.priceUsd} USD
                          </motion.button>
                        )
                      ) : (
                        <motion.button
                          type="button"
                          disabled={isUpdating}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void handleBuyPack(pack)}
                          className={`mt-6 min-h-[46px] w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                            pack.highlighted
                              ? "bg-indigo-500 text-white hover:bg-indigo-400"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          Acheter ce pack · ${pack.priceUsd} USD
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="subscriptions-grid"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"
                >
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <motion.div
                      key={plan.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                      className={`flex flex-col justify-between rounded-2xl border p-5 ${
                        plan.highlighted
                          ? "border-indigo-600 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-display text-base font-bold">
                            {plan.name}
                          </h3>
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              plan.highlighted
                                ? "text-indigo-300"
                                : "text-indigo-600"
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

                        <div className="mt-4 flex items-baseline gap-1.5">
                          <span className="font-display text-3xl font-extrabold tabular-nums">
                            ${plan.monthlyPriceUsd}
                          </span>
                          <span
                            className={`text-xs font-semibold uppercase tracking-wide ${
                              plan.highlighted
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {plan.paymentUrl
                              ? "USD · paiement unique"
                              : "USD / mois"}
                          </span>
                        </div>
                        {plan.paymentNote && (
                          <p
                            className={`mt-1.5 text-[11px] font-medium ${
                              plan.highlighted
                                ? "text-indigo-300"
                                : "text-indigo-600"
                            }`}
                          >
                            {plan.paymentNote}
                          </p>
                        )}

                        <ul className="mt-4 space-y-2 border-t border-current/10 pt-3.5">
                          {plan.features.map((feat) => (
                            <li
                              key={feat}
                              className="flex items-start gap-2 text-xs"
                            >
                              <Check
                                className={`h-4 w-4 shrink-0 mt-0.5 ${
                                  plan.highlighted
                                    ? "text-indigo-400"
                                    : "text-indigo-600"
                                }`}
                                aria-hidden="true"
                              />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {plan.paymentUrl ? (
                        isSignedIn ? (
                          <a
                            href={plan.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              handleExternalCheckoutClick(
                                plan.name,
                                plan.monthlyPriceUsd,
                                plan.creditsPerMonth
                              )
                            }
                            className={`mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                              plan.highlighted
                                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            <span>
                              Payer ${plan.monthlyPriceUsd} USD
                            </span>
                            <ExternalLink
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              onRequireAuth?.(
                                `Connectez-vous pour payer ${plan.name} ($${plan.monthlyPriceUsd} USD) et associer les ${plan.creditsPerMonth} crédits à votre compte.`
                              )
                            }
                            className={`mt-5 min-h-[44px] w-full rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                              plan.highlighted
                                ? "bg-indigo-500 text-white hover:bg-indigo-400"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            }`}
                          >
                            Se connecter pour payer · ${plan.monthlyPriceUsd} USD
                          </motion.button>
                        )
                      ) : (
                        <motion.button
                          type="button"
                          disabled={isUpdating}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => void handleSubscribe(plan)}
                          className={`mt-5 min-h-[44px] w-full rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                            plan.highlighted
                              ? "bg-indigo-500 text-white hover:bg-indigo-400"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          S’abonner · ${plan.monthlyPriceUsd} / mois
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
