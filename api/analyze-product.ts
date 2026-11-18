import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI, Type } from "@google/genai";

type ToneOption =
  | "Dynamique Réseaux Sociaux"
  | "Professionnel E-commerce"
  | "Luxe";

interface AnalyzeProductBody {
  imageBase64?: string;
  mimeType?: string;
  price?: string;
  promoBadge?: string;
  tone?: ToneOption;
}

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const VALID_TONES: ReadonlyArray<ToneOption> = [
  "Dynamique Réseaux Sociaux",
  "Professionnel E-commerce",
  "Luxe",
];

const VALID_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "Clé API Gemini manquante. Configurez GEMINI_API_KEY dans les variables d'environnement Vercel."
    );
  }
  return new GoogleGenAI({ apiKey });
}

function parseBody(rawBody: unknown): AnalyzeProductBody {
  if (!rawBody) return {};
  if (typeof rawBody === "string") {
    try {
      return JSON.parse(rawBody) as AnalyzeProductBody;
    } catch {
      return {};
    }
  }
  if (typeof rawBody === "object") {
    return rawBody as AnalyzeProductBody;
  }
  return {};
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  try {
    const body = parseBody(req.body);
    const imageBase64 = body.imageBase64?.trim() ?? "";
    const mimeType = body.mimeType?.trim().toLowerCase() || "image/jpeg";
    const price = body.price?.trim() ?? "";
    const promoBadge = body.promoBadge?.trim() ?? "";
    const tone: ToneOption = VALID_TONES.includes(body.tone as ToneOption)
      ? (body.tone as ToneOption)
      : "Dynamique Réseaux Sociaux";

    if (!imageBase64) {
      res.status(400).json({
        error: "Aucune image fournie. Veuillez importer une photo produit.",
      });
      return;
    }

    if (!VALID_MIME_TYPES.has(mimeType)) {
      res.status(400).json({
        error: "Format d'image non supporté. Utilisez JPG, PNG ou WebP.",
      });
      return;
    }

    const ai = getGeminiClient();

    const toneGuidance: Record<ToneOption, string> = {
      "Dynamique Réseaux Sociaux":
        "Ton énergique, direct, chaleureux et orienté conversion rapide pour Instagram, TikTok et WhatsApp. Emojis ciblés, phrases courtes et percutantes.",
      "Professionnel E-commerce":
        "Ton clair, rassurant, structuré et orienté bénéfices concrets pour Shopify, WooCommerce ou boutique en ligne. Vocabulaire précis et professionnel.",
      Luxe:
        "Ton raffiné, sobre, sensoriel et exclusif pour une marque haut de gamme. Vocabulaire élégant, zéro familiarité excessive, emojis très discrets.",
    };

    const promptText = [
      "Tu es un expert en copywriting e-commerce francophone et en conversion sur les réseaux sociaux (Instagram, TikTok, WhatsApp, Shopify).",
      "Analyse attentivement cette photo de produit et génère une fiche produit complète et vendeuse en français.",
      `Ton demandé : ${tone} (${toneGuidance[tone]})`,
      price
        ? `Prix indiqué par le vendeur : ${price}. Intègre-le naturellement si pertinent dans la description sociale.`
        : "Aucun prix fourni : ne l'invente pas.",
      promoBadge
        ? `Offre / badge promo indiqué : ${promoBadge}. Mets cette offre en valeur.`
        : "Aucun badge promo fourni.",
      "Contraintes strictes :",
      "- shortPosterTitle : Titre ultra court (2 à 5 mots maximum, max 34 caractères) pour afficher en gros sur une affiche publicitaire.",
      "- seoTitle : Titre SEO complet et optimisé pour la fiche produit (55 à 80 caractères).",
      "- socialShortDesc : Description courte et percutante (2 à 4 phrases) prête à coller sur WhatsApp ou Instagram, avec emojis adaptés et appel à l'action.",
      "- longDescription : Paragraphe persuasif pour boutique en ligne décrivant le produit visible sur la photo, sa valeur et son usage.",
      "- benefits : Exactement 4 points forts / bénéfices concrets (chaque puce en 1 phrase claire et orientée client).",
      "- hashtags : Exactement 10 hashtags pertinents en français ou e-commerce commençant chacun par # (sans espaces internes).",
      "- detectedCategory : Catégorie courte du produit identifié (ex: Chaussures, Cosmétique, Accessoire Tech, Mode).",
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
              data: imageBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction:
          "Tu analyses des photos de produits pour des e-commerçants francophones. Tu réponds uniquement en JSON valide conforme au schéma fourni, sans texte autour.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCategory: {
              type: Type.STRING,
              description: "Catégorie courte du produit détecté sur la photo.",
            },
            shortPosterTitle: {
              type: Type.STRING,
              description:
                "Titre très court (2 à 5 mots, max 34 caractères) destiné aux affiches publicitaires.",
            },
            seoTitle: {
              type: Type.STRING,
              description:
                "Titre SEO complet et optimisé pour fiche produit e-commerce.",
            },
            socialShortDesc: {
              type: Type.STRING,
              description:
                "Description courte et percutante pour WhatsApp/Instagram avec emojis et appel à l'action.",
            },
            longDescription: {
              type: Type.STRING,
              description:
                "Description longue structurée et persuasive pour boutique en ligne.",
            },
            benefits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Liste de exactement 4 puces bénéfices client.",
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Liste de exactement 10 hashtags pertinents commençant par #.",
            },
          },
          required: [
            "detectedCategory",
            "shortPosterTitle",
            "seoTitle",
            "socialShortDesc",
            "longDescription",
            "benefits",
            "hashtags",
          ],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      res.status(502).json({
        error: "L'IA n'a renvoyé aucun contenu. Veuillez réessayer.",
      });
      return;
    }

    const parsed = JSON.parse(rawText) as {
      detectedCategory?: string;
      shortPosterTitle?: string;
      seoTitle?: string;
      socialShortDesc?: string;
      longDescription?: string;
      benefits?: string[];
      hashtags?: string[];
    };

    const normalizedBenefits = Array.isArray(parsed.benefits)
      ? parsed.benefits.filter((b) => typeof b === "string" && b.trim()).slice(0, 4)
      : [];
    const normalizedHashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .filter((h) => typeof h === "string" && h.trim())
          .map((h) => (h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`))
          .slice(0, 10)
      : [];

    res.status(200).json({
      detectedCategory: parsed.detectedCategory?.trim() || "Produit",
      shortPosterTitle: parsed.shortPosterTitle?.trim() || "Édition Spéciale",
      seoTitle: parsed.seoTitle?.trim() || "Produit Premium",
      socialShortDesc: parsed.socialShortDesc?.trim() || "",
      longDescription: parsed.longDescription?.trim() || "",
      benefits: normalizedBenefits,
      hashtags: normalizedHashtags,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur inattendue lors de l'analyse du produit.";
    console.error("[Eradiz Vercel /api/analyze-product]", error);

    const status =
      message.includes("API_KEY") || message.includes("Clé API") ? 500 : 502;
    res.status(status).json({ error: message });
  }
}
