import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      "Clé API Gemini manquante. Configurez GEMINI_API_KEY dans les Secrets de votre environnement."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const port = Number(process.env.PORT) || 3000;

  app.use((_req: Request, res: Response, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  app.use(express.json({ limit: "15mb" }));

  app.get("/robots.txt", (req: Request, res: Response) => {
    const baseUrl =
      process.env.APP_URL?.replace(/\/+$/, "") ||
      `${req.protocol}://${req.get("host") || "localhost:3000"}`;
    res
      .type("text/plain")
      .send(
        [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          `Sitemap: ${baseUrl}/sitemap.xml`,
        ].join("\n")
      );
  });

  app.get("/sitemap.xml", (req: Request, res: Response) => {
    const baseUrl =
      process.env.APP_URL?.replace(/\/+$/, "") ||
      `${req.protocol}://${req.get("host") || "localhost:3000"}`;
    const today = new Date().toISOString().split("T")[0];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
    );
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "eradiz-api" });
  });

  app.get("/api/logo.png", (_req: Request, res: Response) => {
    const logoPath = path.resolve(__dirname, "public", "eradiz-logo.png");
    if (!fs.existsSync(logoPath)) {
      res.status(404).json({ error: "Logo PNG introuvable." });
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="eradiz-logo.png"'
    );
    res.sendFile(logoPath);
  });

  app.post("/api/analyze-product", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as AnalyzeProductBody;
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
                description: "Liste de exactement 10 hashtags pertinents commençant par #.",
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

      res.json({
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
      console.error("[Eradiz /api/analyze-product]", error);

      const status = message.includes("API_KEY") || message.includes("Clé API")
        ? 500
        : 502;
      res.status(status).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*all", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Eradiz server listening on http://0.0.0.0:${port}`);
  });
}

createApp().catch((err) => {
  console.error("Failed to start Eradiz server:", err);
  process.exit(1);
});
