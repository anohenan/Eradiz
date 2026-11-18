import type {
  MotionFormatId,
  MotionVideoConfig,
  VideoFpsOption,
  VideoQualityId,
} from "../types/eradiz";
import { loadImageElement } from "./backgroundRemover";

export interface BoundingBox {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface VideoExportResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: "mp4" | "webm";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
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
  const t = clamp01(ratio);
  return rgbToHex(
    a.r * (1 - t) + b.r * t,
    a.g * (1 - t) + b.g * t,
    a.b * (1 - t) + b.b * t
  );
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(" ");
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
  lines.push(current);
  return lines;
}

export function getBaseDimensions(format: MotionFormatId): {
  width: number;
  height: number;
} {
  return format === "story-9-16"
    ? { width: 720, height: 1280 }
    : { width: 1080, height: 1080 };
}

export function getVideoDimensions(
  format: MotionFormatId,
  quality: VideoQualityId = "hd"
): {
  width: number;
  height: number;
} {
  if (format === "story-9-16") {
    switch (quality) {
      case "sd":
        return { width: 540, height: 960 };
      case "fullhd":
        return { width: 1080, height: 1920 };
      case "hd":
      default:
        return { width: 720, height: 1280 };
    }
  }

  switch (quality) {
    case "sd":
      return { width: 720, height: 720 };
    case "fullhd":
      return { width: 1440, height: 1440 };
    case "hd":
    default:
      return { width: 1080, height: 1080 };
  }
}

export function computeVideoBitrate(
  quality: VideoQualityId,
  fps: VideoFpsOption
): number {
  const base =
    quality === "fullhd"
      ? 8_000_000
      : quality === "hd"
        ? 4_500_000
        : 2_200_000;
  const fpsFactor = fps === 60 ? 1.45 : fps === 24 ? 0.85 : 1;
  return Math.round(base * fpsFactor);
}

export function detectProductBounds(img: HTMLImageElement): BoundingBox {
  const sampleMax = 320;
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
      if (pixels[(y * sw + x) * 4 + 3] > 20) {
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

function drawAnimatedProduct(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bounds: BoundingBox,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  isCutout: boolean,
  options: {
    scaleMultiplier: number;
    offsetY: number;
    rotationRad: number;
    opacity: number;
    shadowIntensity: number;
  }
) {
  const baseScale = Math.min(boxW / bounds.sw, boxH / bounds.sh);
  const drawW = bounds.sw * baseScale * options.scaleMultiplier;
  const drawH = bounds.sh * baseScale * options.scaleMultiplier;
  const centerX = boxX + boxW / 2;
  const centerY = boxY + boxH / 2 + options.offsetY;

  ctx.save();
  ctx.globalAlpha = clamp01(options.opacity);

  // Ombre au sol dynamique qui réagit au flottement
  if (isCutout) {
    const shadowY = boxY + boxH * 0.92;
    const shadowScale = Math.max(0.6, 1 - Math.abs(options.offsetY) / 140);
    const shadowW = drawW * 0.42 * shadowScale;
    const shadowH = Math.max(12, drawH * 0.055 * shadowScale);
    const grad = ctx.createRadialGradient(
      centerX,
      shadowY,
      4,
      centerX,
      shadowY,
      shadowW
    );
    grad.addColorStop(
      0,
      `rgba(2, 6, 23, ${0.34 * options.shadowIntensity * shadowScale})`
    );
    grad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(centerX, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(centerX, centerY);
  ctx.rotate(options.rotationRad);

  if (isCutout) {
    ctx.shadowColor = `rgba(15, 23, 42, ${0.38 * options.shadowIntensity})`;
    ctx.shadowBlur = 38;
    ctx.shadowOffsetY = 18;
    ctx.drawImage(
      img,
      bounds.sx,
      bounds.sy,
      bounds.sw,
      bounds.sh,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
  } else {
    ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    drawRoundedRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 26);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.save();
    drawRoundedRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 26);
    ctx.clip();
    ctx.drawImage(
      img,
      bounds.sx,
      bounds.sy,
      bounds.sw,
      bounds.sh,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawMotionVideoFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  bounds: BoundingBox,
  config: MotionVideoConfig,
  progress: number
) {
  const { width: targetW, height: targetH } = getVideoDimensions(
    config.format,
    config.quality
  );
  const { width: W, height: H } = getBaseDimensions(config.format);
  const scaleX = targetW / W;
  const scaleY = targetH / H;

  ctx.save();
  ctx.scale(scaleX, scaleY);

  const isVertical = config.format === "story-9-16";
  const p = clamp01(progress);
  const elapsedSec = p * config.durationSec;

  const deepColor = mixColor(config.themeColor, "#050816", 0.72);
  const midColor = mixColor(config.themeColor, "#0F172A", 0.25);
  const lightAccent = mixColor(config.themeColor, "#FFFFFF", 0.42);

  // 1. ARRIÈRE-PLAN ANIMÉ SELON LE PRESET
  if (config.preset === "studio-luxe") {
    const bgShift = Math.sin(p * Math.PI * 2) * 0.08;
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#FFFFFF");
    bgGrad.addColorStop(
      0.55 + bgShift,
      mixColor(config.themeColor, "#F8FAFC", 0.9)
    );
    bgGrad.addColorStop(1, mixColor(config.themeColor, "#E2E8F0", 0.84));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ruban lumineux cinétique doux
    ctx.save();
    const waveY = H * 0.44 + Math.sin(elapsedSec * 1.4) * (H * 0.03);
    const aura = ctx.createRadialGradient(
      W * 0.5,
      waveY,
      30,
      W * 0.5,
      waveY,
      W * 0.48
    );
    aura.addColorStop(0, rgba(config.themeColor, 0.16));
    aura.addColorStop(1, rgba(config.themeColor, 0));
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    // Cadre architectural animé progressif
    const frameProgress = easeOutCubic(Math.min(1, elapsedSec / 0.9));
    ctx.strokeStyle = rgba(config.themeColor, 0.28 * frameProgress);
    ctx.lineWidth = 2.5;
    const inset = isVertical ? 32 : 42;
    drawRoundedRect(
      ctx,
      inset,
      inset,
      W - inset * 2,
      H - inset * 2,
      isVertical ? 28 : 32
    );
    ctx.stroke();

    // Cercle piédestal respirant
    const ringScale = 0.94 + Math.sin(elapsedSec * 1.8) * 0.03;
    ctx.fillStyle = rgba(config.themeColor, 0.08);
    ctx.beginPath();
    ctx.arc(
      W / 2,
      isVertical ? H * 0.42 : H * 0.44,
      (isVertical ? 235 : 275) * ringScale * easeOutCubic(Math.min(1, elapsedSec / 0.7)),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  } else if (config.preset === "tiktok-pulse") {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#050711");
    bgGrad.addColorStop(0.5, deepColor);
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Onde rythmique pulsante (beat ~120 BPM)
    const beat = Math.pow(Math.abs(Math.sin(elapsedSec * Math.PI * 1.8)), 3);
    const pulseRadius = (isVertical ? 280 : 340) + beat * 90;
    const pulseGrad = ctx.createRadialGradient(
      W / 2,
      H * 0.44,
      20,
      W / 2,
      H * 0.44,
      pulseRadius
    );
    pulseGrad.addColorStop(0, rgba(config.themeColor, 0.48));
    pulseGrad.addColorStop(0.6, rgba(config.themeColor, 0.14));
    pulseGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pulseGrad;
    ctx.fillRect(0, 0, W, H);

    // Bandeau cinétique défilant en arrière-plan
    ctx.save();
    ctx.translate(W / 2, isVertical ? H * 0.24 : H * 0.23);
    ctx.rotate(-0.07);
    ctx.fillStyle = rgba(config.themeColor, 0.22);
    ctx.fillRect(-W, -28, W * 2, 56);
    const marqueeItem = `${(config.promoBadge || "OFFRE FLASH").toUpperCase()}  ·  `;
    ctx.font = `800 ${isVertical ? 22 : 26}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textBaseline = "middle";
    const textW = ctx.measureText(marqueeItem).width;
    const offset = -((elapsedSec * 130) % Math.max(120, textW));
    for (let x = -W + offset; x < W; x += Math.max(120, textW)) {
      ctx.fillText(marqueeItem, x, 1);
    }
    ctx.restore();
  } else {
    // kinetic-flash (défaut)
    const angleShift = Math.sin(p * Math.PI * 2) * 140;
    const bgGrad = ctx.createLinearGradient(angleShift, 0, W - angleShift, H);
    bgGrad.addColorStop(0, deepColor);
    bgGrad.addColorStop(0.52, config.themeColor);
    bgGrad.addColorStop(1, midColor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Halo projecteur animé
    const spotX = W / 2 + Math.sin(elapsedSec * 1.3) * 35;
    const spotY = H * 0.45 + Math.cos(elapsedSec * 1.1) * 20;
    const glow = ctx.createRadialGradient(spotX, spotY, 30, spotX, spotY, W * 0.55);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    glow.addColorStop(0.55, "rgba(255, 255, 255, 0.08)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Anneaux orbitaux et particules lumineuses
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 2;
    const ringR = (isVertical ? 220 : 280) * easeOutCubic(Math.min(1, elapsedSec / 0.8));
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.44, ringR, elapsedSec * 0.6, elapsedSec * 0.6 + Math.PI * 1.4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      W / 2,
      H * 0.44,
      ringR * 1.18,
      -elapsedSec * 0.4,
      -elapsedSec * 0.4 + Math.PI * 1.1
    );
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const px = ((W * (0.14 + (i * 0.11))) + Math.sin(elapsedSec * 1.2 + i) * 26) % W;
      const py = H - (((elapsedSec * (55 + i * 12) + i * 160) % (H * 0.85)) + 60);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + (i % 3) * 0.08})`;
      ctx.beginPath();
      ctx.arc(px, py, 3 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. BADGE PROMO ANIMÉ (0.08s -> 0.55s)
  const badgeEnter = easeOutBack((elapsedSec - 0.08) / 0.48);
  const badgeText = (
    config.promoBadge.trim() ||
    (config.preset === "tiktok-pulse" ? "OFFRE LIMITÉE" : "NOUVEL ARRIVAGE")
  ).toUpperCase();

  ctx.save();
  ctx.font = `800 ${isVertical ? 22 : 26}px "Plus Jakarta Sans", sans-serif`;
  const badgeW = Math.min(W - 90, ctx.measureText(badgeText).width + 64);
  const badgeH = isVertical ? 54 : 60;
  const badgeCenterX = W / 2;
  const badgeCenterY = isVertical ? 116 : 94;

  ctx.translate(badgeCenterX, badgeCenterY);
  const badgeScale =
    badgeEnter *
    (config.preset === "tiktok-pulse"
      ? 1 + Math.sin(elapsedSec * 5) * 0.03
      : 1);
  ctx.scale(badgeScale, badgeScale);
  ctx.globalAlpha = clamp01((elapsedSec - 0.05) / 0.25);

  ctx.shadowColor = "rgba(15, 23, 42, 0.26)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, 999);
  ctx.fillStyle =
    config.preset === "studio-luxe" ? config.themeColor : "#FFFFFF";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle =
    config.preset === "studio-luxe"
      ? getContrastTextColor(config.themeColor)
      : mixColor(config.themeColor, "#0F172A", 0.28);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, 0, 1, badgeW - 28);
  ctx.restore();

  // 3. PRODUIT ANIMÉ (0.18s -> 0.85s entrée + flottement continu)
  const prodEnter = easeOutCubic((elapsedSec - 0.16) / 0.65);
  const floatCycle =
    config.preset === "tiktok-pulse"
      ? Math.sin(elapsedSec * 3.8) * 9
      : Math.sin(elapsedSec * 2.2) * 12;
  const tiltCycle =
    config.preset === "studio-luxe"
      ? Math.sin(elapsedSec * 1.4) * 0.018
      : Math.sin(elapsedSec * 2.1) * 0.032;
  const beatZoom =
    config.preset === "tiktok-pulse"
      ? 1 + Math.pow(Math.abs(Math.sin(elapsedSec * Math.PI * 1.8)), 4) * 0.045
      : 1 + easeInOutSine((Math.sin(elapsedSec * 1.6) + 1) / 2) * 0.025;

  const prodBoxX = isVertical ? 80 : 165;
  const prodBoxY = isVertical ? 190 : 160;
  const prodBoxW = W - prodBoxX * 2;
  const prodBoxH = isVertical ? 540 : 490;

  drawAnimatedProduct(
    ctx,
    img,
    bounds,
    prodBoxX,
    prodBoxY,
    prodBoxW,
    prodBoxH,
    config.isCutout,
    {
      scaleMultiplier: (0.78 + 0.22 * prodEnter) * beatZoom,
      offsetY: (1 - prodEnter) * 70 + floatCycle,
      rotationRad: (1 - prodEnter) * -0.05 + tiltCycle,
      opacity: clamp01((elapsedSec - 0.12) / 0.35),
      shadowIntensity: prodEnter,
    }
  );

  // Reflet balayant périodiquement la zone produit
  const shimmerPhase = (elapsedSec % 3.2) / 1.1;
  if (shimmerPhase >= 0 && shimmerPhase <= 1) {
    ctx.save();
    const sweepX = -W * 0.3 + shimmerPhase * (W * 1.6);
    const sweepGrad = ctx.createLinearGradient(
      sweepX - 120,
      0,
      sweepX + 120,
      H
    );
    sweepGrad.addColorStop(0, "rgba(255,255,255,0)");
    sweepGrad.addColorStop(0.5, "rgba(255,255,255,0.12)");
    sweepGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 4. TITRE CINÉTIQUE (0.42s -> 0.95s)
  const titleEnter = easeOutCubic((elapsedSec - 0.42) / 0.55);
  const titleText = config.title.trim() || "Nouvelle Collection";
  const isLightTheme = config.preset === "studio-luxe";

  ctx.save();
  ctx.globalAlpha = clamp01((elapsedSec - 0.38) / 0.35);
  ctx.font = `800 ${isVertical ? 44 : 50}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = isLightTheme ? "#0F172A" : "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (!isLightTheme) {
    ctx.shadowColor = "rgba(2, 6, 23, 0.42)";
    ctx.shadowBlur = 16;
  }

  const lines = wrapLines(ctx, titleText, W - 110, 2);
  const titleBaseY = isVertical ? 825 : 745;
  lines.forEach((line, idx) => {
    const lineDelay = easeOutCubic((elapsedSec - (0.42 + idx * 0.12)) / 0.5);
    const slideY = (1 - lineDelay) * 28;
    ctx.fillText(line, W / 2, titleBaseY + idx * (isVertical ? 54 : 58) + slideY);
  });
  ctx.restore();

  // 5. PRIX ANIMÉ (0.65s -> 1.15s)
  const hasPrice = Boolean(config.price.trim());
  if (hasPrice) {
    const priceEnter = easeOutBack((elapsedSec - 0.65) / 0.5);
    const priceText = config.price.trim();
    const priceY = isVertical
      ? lines.length > 1
        ? 950
        : 905
      : lines.length > 1
        ? 852
        : 814;

    ctx.save();
    ctx.font = `800 ${isVertical ? 36 : 40}px "JetBrains Mono", "Plus Jakarta Sans", monospace`;
    const priceW = Math.min(W - 140, ctx.measureText(priceText).width + 78);
    const priceH = isVertical ? 76 : 80;
    ctx.translate(W / 2, priceY);
    ctx.scale(priceEnter, priceEnter);
    ctx.globalAlpha = clamp01((elapsedSec - 0.6) / 0.25);

    ctx.shadowColor = "rgba(2, 6, 23, 0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    drawRoundedRect(ctx, -priceW / 2, -priceH / 2, priceW, priceH, 18);
    ctx.fillStyle = isLightTheme ? "#0F172A" : "#090D1F";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = isLightTheme ? config.themeColor : lightAccent;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, -priceW / 2, -priceH / 2, priceW, priceH, 18);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, 0, 2, priceW - 32);
    ctx.restore();
  }

  // 6. BOUTON CTA PULSANT (0.85s -> fin)
  const ctaEnter = easeOutCubic((elapsedSec - 0.85) / 0.5);
  const ctaPulse = 1 + Math.sin(elapsedSec * 4) * 0.018;
  const ctaText = config.ctaText.trim() || "Commandez maintenant";
  const ctaW = Math.min(W - 110, isVertical ? 520 : 540);
  const ctaH = isVertical ? 84 : 84;
  const ctaCenterY = isVertical ? 1105 : 955;

  ctx.save();
  ctx.translate(W / 2, ctaCenterY + (1 - ctaEnter) * 32);
  ctx.scale(ctaEnter * ctaPulse, ctaEnter * ctaPulse);
  ctx.globalAlpha = clamp01((elapsedSec - 0.8) / 0.3);

  ctx.shadowColor = "rgba(2, 6, 23, 0.28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  drawRoundedRect(ctx, -ctaW / 2, -ctaH / 2, ctaW, ctaH, 22);
  ctx.fillStyle = isLightTheme ? config.themeColor : "#FFFFFF";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = isLightTheme
    ? getContrastTextColor(config.themeColor)
    : "#0F172A";
  ctx.font = `800 ${isVertical ? 28 : 30}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, 0, 2, ctaW - 40);
  ctx.restore();

  // 7. BARRE DE PROGRESSION DISCRÈTE EN BAS (style Story / Reels)
  ctx.save();
  const barW = W - 80;
  const barY = H - 28;
  drawRoundedRect(ctx, 40, barY, barW, 5, 3);
  ctx.fillStyle = isLightTheme
    ? "rgba(15, 23, 42, 0.14)"
    : "rgba(255, 255, 255, 0.22)";
  ctx.fill();

  drawRoundedRect(ctx, 40, barY, Math.max(8, barW * p), 5, 3);
  ctx.fillStyle = isLightTheme ? config.themeColor : "#FFFFFF";
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function pickSupportedRecorderMimeType(): {
  mimeType: string;
  extension: "mp4" | "webm";
} {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", extension: "webm" };
  }

  const candidates: { mimeType: string; extension: "mp4" | "webm" }[] = [
    { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];

  for (const item of candidates) {
    if (
      typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(item.mimeType)
    ) {
      return item;
    }
  }
  return { mimeType: "", extension: "webm" };
}

export async function exportMotionVideo(
  config: MotionVideoConfig,
  onProgress: (percent: number) => void
): Promise<VideoExportResult> {
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue with fallback fonts
    }
  }

  const img = await loadImageElement(config.imageSrc);
  const bounds = config.isCutout
    ? detectProductBounds(img)
    : { sx: 0, sy: 0, sw: img.width, sh: img.height };

  const { width, height } = getVideoDimensions(config.format, config.quality);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexte Canvas 2D indisponible sur cet appareil.");
  }

  const streamCapable = canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
  };

  if (
    typeof streamCapable.captureStream !== "function" ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error(
      "L'export vidéo en direct n'est pas pris en charge par ce navigateur. Utilisez Chrome, Edge ou Safari récent."
    );
  }

  const targetFps = config.fps || 30;
  const videoBitrate = computeVideoBitrate(config.quality, targetFps);
  const { mimeType, extension } = pickSupportedRecorderMimeType();
  const stream = streamCapable.captureStream(targetFps);
  const recorder = mimeType
    ? new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: videoBitrate,
      })
    : new MediaRecorder(stream, { videoBitsPerSecond: videoBitrate });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const durationMs = config.durationSec * 1000;

  return new Promise<VideoExportResult>((resolve, reject) => {
    let rafId = 0;

    recorder.onerror = () => {
      cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error("Échec de l'encodage vidéo dans le navigateur."));
    };

    recorder.onstop = () => {
      cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
      const finalType = mimeType || `video/${extension}`;
      const blob = new Blob(chunks, { type: finalType });
      const url = URL.createObjectURL(blob);
      onProgress(100);
      resolve({ blob, url, mimeType: finalType, extension });
    };

    drawMotionVideoFrame(ctx, img, bounds, config, 0);
    recorder.start(150);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      drawMotionVideoFrame(ctx, img, bounds, config, progress);
      onProgress(Math.round(progress * 98));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        window.setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 120);
      }
    };

    rafId = requestAnimationFrame(step);
  });
}
