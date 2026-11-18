import { removeBackground } from "@imgly/background-removal";

export interface PreparedImage {
  originalDataUrl: string;
  apiBase64: string;
  apiMimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Impossible de charger l'image sélectionnée."));
    img.src = src;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Erreur lors de la conversion de l'image."));
      }
    };
    reader.onerror = () =>
      reject(new Error("Erreur de lecture du fichier image."));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

function resizeCanvasFromImage(
  img: HTMLImageElement,
  maxDimension: number,
  mimeType: "image/png" | "image/jpeg",
  quality: number
): string {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexte Canvas indisponible dans ce navigateur.");
  }
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(mimeType, quality);
}

export async function prepareImageForProcessing(
  file: File
): Promise<PreparedImage> {
  const rawDataUrl = await fileToDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  // Version haute définition (max 1500px) pour un détourage précis et rapide sur mobile
  const originalDataUrl =
    Math.max(img.width, img.height) > 1500
      ? resizeCanvasFromImage(img, 1500, "image/png", 0.95)
      : rawDataUrl;

  // Version optimisée (max 1024px JPEG) pour l'analyse rapide via Gemini Vision
  const apiDataUrl = resizeCanvasFromImage(img, 1024, "image/jpeg", 0.88);
  const apiBase64 = apiDataUrl.split(",")[1] ?? "";

  return {
    originalDataUrl,
    apiBase64,
    apiMimeType: "image/jpeg",
    width: img.width,
    height: img.height,
  };
}

export interface BackgroundRemovalResult {
  cutoutDataUrl: string;
  succeeded: boolean;
  errorMessage?: string;
}

export async function removeProductBackground(
  imageDataUrl: string,
  onProgress?: (percent: number) => void,
  timeoutMs = 35000
): Promise<BackgroundRemovalResult> {
  try {
    const response = await fetch(imageDataUrl);
    const inputBlob = await response.blob();

    const removalPromise = removeBackground(inputBlob, {
      model: "isnet_quint8",
      output: {
        format: "image/png",
        quality: 0.92,
      },
      progress: (_key: string, current: number, total: number) => {
        if (onProgress && total > 0) {
          const pct = Math.min(99, Math.max(5, Math.round((current / total) * 100)));
          onProgress(pct);
        }
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error(
            "Le détourage a pris trop de temps sur cet appareil. Affichage de la photo originale."
          )
        );
      }, timeoutMs);
    });

    const cutoutBlob = await Promise.race([removalPromise, timeoutPromise]);
    const cutoutDataUrl = await blobToDataUrl(cutoutBlob);
    onProgress?.(100);

    return {
      cutoutDataUrl,
      succeeded: true,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "Le détourage automatique n'a pas pu aboutir.";
    return {
      cutoutDataUrl: imageDataUrl,
      succeeded: false,
      errorMessage: msg,
    };
  }
}
