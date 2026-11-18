export type ToneOption =
  | "Dynamique Réseaux Sociaux"
  | "Professionnel E-commerce"
  | "Luxe";

export type PricingTab = "packs" | "subscriptions";

export interface ProductAnalysis {
  detectedCategory: string;
  shortPosterTitle: string;
  seoTitle: string;
  socialShortDesc: string;
  longDescription: string;
  benefits: string[];
  hashtags: string[];
}

export type AdTemplateId = "flash-sale" | "minimal-studio" | "story-whatsapp";

export interface AdPosterRender {
  id: AdTemplateId;
  title: string;
  subtitle: string;
  aspectLabel: string;
  width: number;
  height: number;
  dataUrl: string;
}

export interface GenerationStepState {
  id: 1 | 2 | 3;
  label: string;
  status: "pending" | "active" | "done" | "fallback";
  detail?: string;
}

export interface CreditsState {
  balance: number;
  activePlan: string;
  isFirstVisitGranted: boolean;
  totalGenerated: number;
  updatedAt: string;
}

export interface PricingPack {
  id: "starter" | "pro";
  name: string;
  audience: string;
  credits: number;
  priceUsd: number;
  features: string[];
  highlighted?: boolean;
  paymentUrl?: string;
  paymentNote?: string;
}

export interface SubscriptionPlan {
  id: "creator" | "boutique" | "agency";
  name: string;
  audience: string;
  creditsPerMonth: number;
  monthlyPriceUsd: number;
  badge?: string;
  features: string[];
  highlighted?: boolean;
  paymentUrl?: string;
  paymentNote?: string;
}

export interface ProductLedgerRow {
  id: string;
  name: string;
  quantity: number;
  costPriceUsd: number;
  adAndFeesUsd: number;
  salePriceUsd: number;
}

export type MotionPresetId = "kinetic-flash" | "studio-luxe" | "tiktok-pulse";

export type MotionFormatId = "story-9-16" | "square-1-1";

export type VideoQualityId = "sd" | "hd" | "fullhd";

export type VideoFpsOption = 24 | 30 | 60;

export type ImageExportQuality = "web" | "hd" | "ultra";

export type ImageExportFormat = "png" | "jpeg" | "webp";

export interface MotionVideoConfig {
  imageSrc: string;
  isCutout: boolean;
  preset: MotionPresetId;
  format: MotionFormatId;
  quality: VideoQualityId;
  fps: VideoFpsOption;
  durationSec: 5 | 8 | 12;
  themeColor: string;
  title: string;
  price: string;
  promoBadge: string;
  ctaText: string;
}
