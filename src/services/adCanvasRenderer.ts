import type {
  AdPosterRender,
  ImageExportFormat,
  ImageExportQuality,
} from "../types/eradiz";
import { loadImageElement } from "./backgroundRemover";

interface RenderPosterParams {
  imageSrc: string;
  shortTitle: string;
  price?: string;
  promoBadge?: string;
  themeColor: string;
  isCutout: boolean;
}

interface BoundingBox {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) {
    return { r: 79, g: 70, b: 229 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

function mixColor(hexA: string, hexB: string, ratio: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(
    a.r * (1 - t) + b.r * t,
    a.g * (1 - t) + b.g * t,
    a.b * (1 - t) + b.b * t
  );
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function getContrastTextColor(bgHex: string): string {
  return getRelativeLuminance(bgHex) > 0.36 ? "#0F172A" : "#FFFFFF";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function detectOpaqueBounds(img: HTMLImageElement): BoundingBox {
  const sampleMax = 400;
  const scale = Math.min(1, sampleMax / Math.max(img.width, img.height));
  const sw = Math.max(1, Math.round(img.width * scale));
  const sh = Math.max(1, Math.round(img.height * scale));

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  }

  tempCtx.drawImage(img, 0, 0, sw, sh);
  const pixels = tempCtx.getImageData(0, 0, sw, sh).data;

  let minX = sw;
  let minY = sh;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const alpha = pixels[(y * sw + x) * 4 + 3];
      if (alpha > 18) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found || maxX <= minX || maxY <= minY) {
    return { sx: 0, sy: 0, sw: img.width, sh: img.height };
  }

  const inv = 1 / scale;
  const pad = 6;
  const sx = Math.max(0, Math.floor(minX * inv) - pad);
  const sy = Math.max(0, Math.floor(minY * inv) - pad);
  const right = Math.min(img.width, Math.ceil((maxX + 1) * inv) + pad);
  const bottom = Math.min(img.height, Math.ceil((maxY + 1) * inv) + pad);

  return {
    sx,
    sy,
    sw: Math.max(1, right - sx),
    sh: Math.max(1, bottom - sy),
  };
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${currentLine} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length === maxLines - 1) {
        // Append remaining words on final line with ellipsis if needed
        const rest = [currentLine, ...words.slice(i + 1)].join(" ");
        let trimmed = rest;
        while (
          trimmed.length > 3 &&
          ctx.measureText(`${trimmed}…`).width > maxWidth
        ) {
          trimmed = trimmed.slice(0, -1).trimEnd();
        }
        lines.push(
          ctx.measureText(rest).width <= maxWidth ? rest : `${trimmed}…`
        );
        return lines;
      }
    }
  }
  lines.push(currentLine);
  return lines;
}

function drawFittedProduct(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bounds: BoundingBox,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  isCutout: boolean,
  shadowColor = "rgba(15, 23, 42, 0.34)"
) {
  const scale = Math.min(boxW / bounds.sw, boxH / bounds.sh);
  const drawW = bounds.sw * scale;
  const drawH = bounds.sh * scale;
  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;

  ctx.save();
  if (isCutout) {
    // Soft ground contact ellipse
    const groundY = drawY + drawH - 12;
    const grad = ctx.createRadialGradient(
      drawX + drawW / 2,
      groundY,
      8,
      drawX + drawW / 2,
      groundY,
      drawW * 0.44
    );
    grad.addColorStop(0, "rgba(15, 23, 42, 0.28)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(
      drawX + drawW / 2,
      groundY,
      drawW * 0.44,
      Math.max(18, drawH * 0.06),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 46;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 24;
    ctx.drawImage(
      img,
      bounds.sx,
      bounds.sy,
      bounds.sw,
      bounds.sh,
      drawX,
      drawY,
      drawW,
      drawH
    );
  } else {
    // Original photo presented as a crisp studio-framed card
    ctx.shadowColor = "rgba(15, 23, 42, 0.24)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 32);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 32);
    ctx.clip();
    ctx.drawImage(
      img,
      bounds.sx,
      bounds.sy,
      bounds.sw,
      bounds.sh,
      drawX,
      drawY,
      drawW,
      drawH
    );
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
}

function renderFlashSalePoster(
  img: HTMLImageElement,
  bounds: BoundingBox,
  params: RenderPosterParams
): string {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const deepColor = mixColor(params.themeColor, "#090D1F", 0.58);
  const brightColor = mixColor(params.themeColor, "#FFFFFF", 0.14);

  // Rich modern gradient backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, deepColor);
  bgGrad.addColorStop(0.55, params.themeColor);
  bgGrad.addColorStop(1, brightColor);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft studio spotlight behind product
  const glow = ctx.createRadialGradient(W / 2, H * 0.47, 40, W / 2, H * 0.47, 470);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  glow.addColorStop(0.55, "rgba(255, 255, 255, 0.08)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle architectural grid accent lines
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 36, 36, W - 72, H - 72, 36);
  ctx.stroke();
  ctx.restore();

  // Top Promo Badge
  const badgeText = (params.promoBadge?.trim() || "OFFRE FLASH").toUpperCase();
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = Math.min(W - 140, badgeMetrics.width + 72);
  const badgeH = 66;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 68;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 999);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = mixColor(params.themeColor, "#0F172A", 0.32);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, W / 2, badgeY + badgeH / 2 + 1, badgeW - 36);

  // Center Product
  const productTop = 165;
  const productBottom = params.price?.trim() ? 745 : 805;
  drawFittedProduct(
    ctx,
    img,
    bounds,
    130,
    productTop,
    W - 260,
    productBottom - productTop,
    params.isCutout
  );

  // Bottom title + highlighted price card
  const titleText = params.shortTitle.trim() || "Édition Limitée";
  ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const lines = wrapTextLines(ctx, titleText, W - 160, 2);
  const hasPrice = Boolean(params.price?.trim());
  const titleBaseY = hasPrice ? 830 : 885;
  lines.forEach((line, index) => {
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
    ctx.shadowBlur = 14;
    ctx.fillText(line, W / 2, titleBaseY + index * 62);
    ctx.restore();
  });

  if (hasPrice) {
    const priceText = params.price!.trim();
    ctx.font = '800 44px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    const priceW = Math.min(W - 180, ctx.measureText(priceText).width + 92);
    const priceH = 88;
    const priceX = (W - priceW) / 2;
    const priceY = lines.length > 1 ? 928 : 886;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.32)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    drawRoundedRect(ctx, priceX, priceY, priceW, priceH, 22);
    ctx.fillStyle = "#0F172A";
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, priceX, priceY, priceW, priceH, 22);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, W / 2, priceY + priceH / 2 + 2, priceW - 40);
  }

  return canvas.toDataURL("image/png");
}

function renderMinimalStudioPoster(
  img: HTMLImageElement,
  bounds: BoundingBox,
  params: RenderPosterParams
): string {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Clean bright studio backdrop
  const tintBg = mixColor(params.themeColor, "#F8FAFC", 0.94);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#FFFFFF");
  bgGrad.addColorStop(1, tintBg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle architectural hairline inset
  ctx.strokeStyle = mixColor(params.themeColor, "#CBD5E1", 0.68);
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 28);
  ctx.stroke();

  // Studio pedestal circle behind product
  ctx.fillStyle = mixColor(params.themeColor, "#F1F5F9", 0.88);
  ctx.beginPath();
  ctx.arc(W / 2, 485, 290, 0, Math.PI * 2);
  ctx.fill();

  // Header row: Category/Promo tag left, clean accent line
  const promoText = params.promoBadge?.trim();
  if (promoText) {
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    const tagW = Math.min(460, ctx.measureText(promoText).width + 48);
    const tagH = 52;
    drawRoundedRect(ctx, 88, 86, tagW, tagH, 12);
    ctx.fillStyle = params.themeColor;
    ctx.fill();

    ctx.fillStyle = getContrastTextColor(params.themeColor);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(promoText, 88 + tagW / 2, 86 + tagH / 2 + 1, tagW - 24);
  } else {
    ctx.fillStyle = params.themeColor;
    ctx.fillRect(88, 108, 72, 6);
  }

  // Product centered cleanly
  drawFittedProduct(
    ctx,
    img,
    bounds,
    170,
    185,
    W - 340,
    560,
    params.isCutout,
    "rgba(15, 23, 42, 0.22)"
  );

  // Bottom editorial lockup
  const dividerY = 810;
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(88, dividerY);
  ctx.lineTo(W - 88, dividerY);
  ctx.stroke();

  const titleText = params.shortTitle.trim() || "Collection Studio";
  const hasPrice = Boolean(params.price?.trim());

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0F172A";
  ctx.font = '700 46px "Plus Jakarta Sans", sans-serif';
  const maxTitleWidth = hasPrice ? W - 460 : W - 176;
  const lines = wrapTextLines(ctx, titleText, maxTitleWidth, 2);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 88, 892 + idx * 54);
  });

  if (hasPrice) {
    const priceText = params.price!.trim();
    ctx.font = '700 42px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    const priceW = Math.min(340, ctx.measureText(priceText).width + 64);
    const priceH = 82;
    const priceX = W - 88 - priceW;
    const priceY = 860;

    drawRoundedRect(ctx, priceX, priceY, priceW, priceH, 16);
    ctx.fillStyle = "#0F172A";
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, priceX + priceW / 2, priceY + priceH / 2 + 2, priceW - 24);
  }

  return canvas.toDataURL("image/png");
}

function renderStoryWhatsappPoster(
  img: HTMLImageElement,
  bounds: BoundingBox,
  params: RenderPosterParams
): string {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const darkTone = mixColor(params.themeColor, "#020617", 0.72);
  const midTone = mixColor(params.themeColor, "#0F172A", 0.25);

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, darkTone);
  bgGrad.addColorStop(0.45, midTone);
  bgGrad.addColorStop(1, darkTone);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft vertical studio aura behind product
  const aura = ctx.createRadialGradient(W / 2, H * 0.44, 60, W / 2, H * 0.44, 560);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  aura.addColorStop(0.5, mixColor(params.themeColor, "#FFFFFF", 0.2) + "33");
  aura.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  // Top promo badge
  const promoText = (
    params.promoBadge?.trim() || "DISPONIBLE MAINTENANT"
  ).toUpperCase();
  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  const promoW = Math.min(W - 140, ctx.measureText(promoText).width + 80);
  const promoH = 74;
  const promoX = (W - promoW) / 2;
  const promoY = 140;

  drawRoundedRect(ctx, promoX, promoY, promoW, promoH, 999);
  ctx.fillStyle = params.themeColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = getContrastTextColor(params.themeColor);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(promoText, W / 2, promoY + promoH / 2 + 2, promoW - 36);

  // Large hero product in middle
  drawFittedProduct(
    ctx,
    img,
    bounds,
    95,
    275,
    W - 190,
    910,
    params.isCutout,
    "rgba(0, 0, 0, 0.48)"
  );

  // Title
  const titleText = params.shortTitle.trim() || "Nouvelle Collection";
  ctx.font = '800 66px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const lines = wrapTextLines(ctx, titleText, W - 140, 2);
  lines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, 1300 + idx * 78);
  });

  // Price highlight
  const hasPrice = Boolean(params.price?.trim());
  if (hasPrice) {
    const priceText = params.price!.trim();
    ctx.font = '800 62px "JetBrains Mono", "Plus Jakarta Sans", monospace';
    ctx.fillStyle = mixColor(params.themeColor, "#FFFFFF", 0.55);
    const priceY = lines.length > 1 ? 1480 : 1425;
    ctx.fillText(priceText, W / 2, priceY);
  }

  // Prominent CTA Button ("Commandez maintenant")
  const ctaW = 720;
  const ctaH = 112;
  const ctaX = (W - ctaW) / 2;
  const ctaY = 1620;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;
  drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, 28);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#0F172A";
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Commandez maintenant", W / 2, ctaY + ctaH / 2 + 2);

  return canvas.toDataURL("image/png");
}

export async function renderAllAdPosters(
  params: RenderPosterParams
): Promise<AdPosterRender[]> {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system fonts if font loading fails
    }
  }

  const img = await loadImageElement(params.imageSrc);
  const bounds = params.isCutout
    ? detectOpaqueBounds(img)
    : { sx: 0, sy: 0, sw: img.width, sh: img.height };

  return [
    {
      id: "flash-sale",
      title: "Flash Sale",
      subtitle: "Impact fort · Feed Instagram & Facebook",
      aspectLabel: "Carré 1:1 (1080×1080)",
      width: 1080,
      height: 1080,
      dataUrl: renderFlashSalePoster(img, bounds, params),
    },
    {
      id: "minimal-studio",
      title: "Minimaliste Studio",
      subtitle: "Épuré & lumineux · Shopify & Catalogue",
      aspectLabel: "Carré 1:1 (1080×1080)",
      width: 1080,
      height: 1080,
      dataUrl: renderMinimalStudioPoster(img, bounds, params),
    },
    {
      id: "story-whatsapp",
      title: "Statut WhatsApp / Story",
      subtitle: "Plein écran mobile · TikTok, Reels & WhatsApp",
      aspectLabel: "Vertical 9:16 (1080×1920)",
      width: 1080,
      height: 1920,
      dataUrl: renderStoryWhatsappPoster(img, bounds, params),
    },
  ];
}

export function getImageQualityScale(quality: ImageExportQuality): number {
  switch (quality) {
    case "web":
      return 720 / 1080;
    case "ultra":
      return 2;
    case "hd":
    default:
      return 1;
  }
}

export async function exportImageVariant(
  sourceDataUrl: string,
  baseWidth: number,
  baseHeight: number,
  quality: ImageExportQuality,
  format: ImageExportFormat
): Promise<{ dataUrl: string; width: number; height: number; mimeType: string; extension: string }> {
  const img = await loadImageElement(sourceDataUrl);
  const scale = getImageQualityScale(quality);
  const targetW = Math.max(1, Math.round(baseWidth * scale));
  const targetH = Math.max(1, Math.round(baseHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponible pour l'export.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (format === "jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);

  const mimeType =
    format === "jpeg"
      ? "image/jpeg"
      : format === "webp"
        ? "image/webp"
        : "image/png";
  const encoderQuality = format === "png" ? undefined : 0.92;
  const dataUrl = canvas.toDataURL(mimeType, encoderQuality);
  const extension = format === "jpeg" ? "jpg" : format;

  return {
    dataUrl,
    width: targetW,
    height: targetH,
    mimeType,
    extension,
  };
}

export async function compressDataUrlForStorage(
  sourceDataUrl: string,
  options: {
    maxDim: number;
    maxLength: number;
    preserveAlpha: boolean;
  }
): Promise<string> {
  const img = await loadImageElement(sourceDataUrl);
  const attempts: { dim: number; quality: number; mime: "image/webp" | "image/jpeg" | "image/png" }[] =
    options.preserveAlpha
      ? [
          { dim: options.maxDim, quality: 0.84, mime: "image/webp" },
          { dim: Math.round(options.maxDim * 0.78), quality: 0.74, mime: "image/webp" },
          { dim: Math.round(options.maxDim * 0.6), quality: 0.65, mime: "image/webp" },
          { dim: 340, quality: 0.6, mime: "image/webp" },
          { dim: 260, quality: 1, mime: "image/png" },
        ]
      : [
          { dim: options.maxDim, quality: 0.82, mime: "image/webp" },
          { dim: options.maxDim, quality: 0.76, mime: "image/jpeg" },
          { dim: Math.round(options.maxDim * 0.75), quality: 0.68, mime: "image/jpeg" },
          { dim: 260, quality: 0.6, mime: "image/jpeg" },
        ];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return sourceDataUrl.slice(0, options.maxLength);
  }

  let bestResult = "";

  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.dim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    if (attempt.mime === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const encoded =
      attempt.mime === "image/png"
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL(attempt.mime, attempt.quality);

    bestResult = encoded;
    if (encoded.length <= options.maxLength) {
      return encoded;
    }
  }

  return bestResult;
}

