import { useState } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { motion } from "motion/react";

export type LegalTab = "privacy" | "terms";

interface LegalPageProps {
  initialTab?: LegalTab;
  onBackHome: () => void;
  onClearLocalData: () => void;
}

export function LegalPage({
  initialTab = "privacy",
  onBackHome,
  onClearLocalData,
}: LegalPageProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [cleared, setCleared] = useState(false);

  const handleClearData = () => {
    onClearLocalData();
    setCleared(true);
    window.setTimeout(() => setCleared(false), 3000);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retour à l’accueil</span>
          </button>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Informations légales &amp; confidentialité
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Dernière mise à jour : 14 novembre 2026 · Application Eradiz
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Documents légaux"
          className="inline-flex rounded-xl bg-slate-100 p-1 self-start"
        >
          {(
            [
              { id: "privacy", label: "Politique de Confidentialité" },
              { id: "terms", label: "Conditions d’Utilisation" },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="legal-tab-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-xs"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "privacy" ? (
        <motion.article
          key="privacy"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-sm leading-relaxed text-slate-700"
        >
          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              1. Responsable et objet du traitement
            </h2>
            <p className="mt-2">
              La présente Politique de Confidentialité décrit la manière dont
              l’application web et mobile <strong>Eradiz</strong> traite vos
              images et informations techniques lors de l’utilisation du studio de
              création de fiches produits et d’affiches publicitaires.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Traitement des photos et accès caméra / galerie
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>
                <strong>Détourage 100 % local :</strong> La suppression
                d’arrière-plan est effectuée directement dans la mémoire de votre
                navigateur ou appareil mobile. Votre photo originale haute
                résolution utilisée pour le détourage n’est ni archivée ni stockée
                sur nos serveurs.
              </li>
              <li>
                <strong>Analyse IA éphémère :</strong> Une copie optimisée de
                l’image importée est transmise de manière sécurisée (HTTPS) à
                l’API d’analyse visuelle uniquement le temps nécessaire à la
                génération de votre titre SEO, de vos descriptions marketing et de
                vos hashtags. Aucune base de données publique ne conserve vos
                photos après la réponse.
              </li>
              <li>
                <strong>Permissions appareil :</strong> L’accès à la caméra ou à
                la galerie photo n’est déclenché que sur action volontaire de
                votre part lors de l’importation d’un produit.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              3. Absence de revente et stockage des données
            </h2>
            <p className="mt-2">
              Eradiz <strong>ne vend, ne loue et ne cède jamais</strong> vos
              photos, vos fiches produits ou vos données personnelles à des tiers
              à des fins publicitaires ou commerciales. Votre adresse e-mail,
              votre nom d’affichage et votre solde de crédits sont synchronisés
              de manière sécurisée via <strong>Firebase Authentication</strong>{" "}
              et <strong>Cloud Firestore</strong> (ou localement via{" "}
              <code className="font-mono text-xs">localStorage</code> en mode
              hors-ligne / prévisualisation).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              4. Suppression de vos données
            </h2>
            <p className="mt-2">
              Vous gardez le contrôle total sur vos données. Vous pouvez supprimer
              instantanément les données locales enregistrées sur cet appareil en
              cliquant sur le bouton ci-dessous, ou contacter notre support pour
              toute demande relative à la confidentialité à{" "}
              <span className="font-mono text-xs font-semibold text-slate-900">
                support@eradiz.app
              </span>
              .
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleClearData}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Réinitialiser mes données locales</span>
              </button>
              {cleared && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Données locales réinitialisées.
                </span>
              )}
            </div>
          </section>
        </motion.article>
      ) : (
        <motion.article
          key="terms"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-sm leading-relaxed text-slate-700"
        >
          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              1. Objet des Conditions Générales d’Utilisation
            </h2>
            <p className="mt-2">
              Les présentes Conditions Générales d’Utilisation (CGU) régissent
              l’accès et l’utilisation de l’application <strong>Eradiz</strong>,
              accessible sur le web et en application mobile installable (PWA /
              Android). En utilisant le Studio Eradiz, vous acceptez pleinement ces
              conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Packs de crédits et abonnements mensuels
            </h2>
            <ul className="mt-2 list-disc pl-5 space-y-2">
              <li>
                La formule <strong>Découverte (Gratuit)</strong> attribue{" "}
                <strong>5 crédits gratuits</strong> pour tester le service.
              </li>
              <li>
                La création d’un kit complet (détourage + textes marketing + 3
                affiches PNG) consomme <strong>1 crédit</strong>, déduit
                uniquement lorsque la génération aboutit avec succès.
              </li>
              <li>
                <strong>Packs de crédits (achat unique) :</strong> les packs
                Starter (50 crédits à $12 USD) et Pro Boutiques (200 crédits à
                $29 USD) sont valables sans limite de durée ni expiration.
              </li>
              <li>
                <strong>Abonnements mensuels :</strong> les formules Créateur
                ($9 USD / mois pour 60 crédits), Boutique ($24 USD / mois pour
                250 crédits) et Agence ($49 USD / mois pour 600 crédits)
                renouvellent votre solde chaque mois et sont résiliables à tout
                moment sans engagement.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              3. Propriété intellectuelle et usage commercial
            </h2>
            <p className="mt-2">
              Vous conservez l’intégralité des droits sur les photos que vous
              importez. Tous les visuels détourés, textes marketing et affiches
              publicitaires PNG générés via Eradiz peuvent être utilisés librement
              à des fins commerciales sur vos boutiques en ligne (Shopify,
              WooCommerce) et réseaux sociaux (WhatsApp, Instagram, TikTok,
              Facebook).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">
              4. Usage responsable et disponibilité
            </h2>
            <p className="mt-2">
              L’utilisateur s’engage à importer uniquement des photos de produits
              qu’il est autorisé à commercialiser et à respecter les lois en
              vigueur. Eradiz met tout en œuvre pour garantir la continuité du
              service et fournit un mode de repli automatique sur photo originale
              lorsque le matériel de l’utilisateur limite le détourage local.
            </p>
          </section>
        </motion.article>
      )}
    </section>
  );
}
