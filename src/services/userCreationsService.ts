import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { AdPosterRender, ProductAnalysis } from "../types/eradiz";
import { compressDataUrlForStorage } from "./adCanvasRenderer";
import {
  db,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from "./firebase";
import { ensureUserProfileDocument } from "./userCreditsService";

const LOCAL_CREATIONS_KEY = "eradiz_local_creations_v1";

export interface SavedCreation {
  id: string;
  userId: string;
  shortPosterTitle: string;
  detectedCategory: string;
  seoTitle: string;
  socialShortDesc: string;
  price: string;
  promoBadge: string;
  tone: string;
  themeColor: string;
  isCutout: boolean;
  productImageSrc: string;
  thumbFlashSale: string;
  thumbMinimalStudio: string;
  thumbStoryWhatsapp: string;
  createdAt: Date | null;
}

export interface SaveCreationInput {
  analysis: ProductAnalysis;
  posters: AdPosterRender[];
  productImageSrc: string;
  isCutout: boolean;
  price: string;
  promoBadge: string;
  tone: string;
  themeColor: string;
}

function normalizeHexColor(hex: string): string {
  const clean = hex.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(clean) ? clean.slice(0, 16) : "#4F46E5";
}

export function getLocalCreations(): SavedCreation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CREATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: typeof item.id === "string" ? item.id : `local-${Date.now()}`,
      userId: typeof item.userId === "string" ? item.userId : "local",
      shortPosterTitle:
        typeof item.shortPosterTitle === "string"
          ? item.shortPosterTitle
          : "Création Eradiz",
      detectedCategory:
        typeof item.detectedCategory === "string" ? item.detectedCategory : "",
      seoTitle: typeof item.seoTitle === "string" ? item.seoTitle : "",
      socialShortDesc:
        typeof item.socialShortDesc === "string" ? item.socialShortDesc : "",
      price: typeof item.price === "string" ? item.price : "",
      promoBadge: typeof item.promoBadge === "string" ? item.promoBadge : "",
      tone: typeof item.tone === "string" ? item.tone : "",
      themeColor:
        typeof item.themeColor === "string" ? item.themeColor : "#4F46E5",
      isCutout: Boolean(item.isCutout),
      productImageSrc:
        typeof item.productImageSrc === "string" ? item.productImageSrc : "",
      thumbFlashSale:
        typeof item.thumbFlashSale === "string" ? item.thumbFlashSale : "",
      thumbMinimalStudio:
        typeof item.thumbMinimalStudio === "string"
          ? item.thumbMinimalStudio
          : "",
      thumbStoryWhatsapp:
        typeof item.thumbStoryWhatsapp === "string"
          ? item.thumbStoryWhatsapp
          : "",
      createdAt:
        typeof item.createdAtIso === "string"
          ? new Date(item.createdAtIso)
          : null,
    }));
  } catch {
    return [];
  }
}

function saveLocalCreations(items: SavedCreation[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = items.slice(0, 12).map((item) => ({
      ...item,
      createdAtIso: item.createdAt ? item.createdAt.toISOString() : null,
    }));
    window.localStorage.setItem(LOCAL_CREATIONS_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore localStorage quota errors
  }
}

export async function saveUserCreation(
  user: User | null,
  input: SaveCreationInput
): Promise<SavedCreation | null> {
  const flashPoster = input.posters.find((p) => p.id === "flash-sale");
  const minimalPoster = input.posters.find((p) => p.id === "minimal-studio");
  const storyPoster = input.posters.find((p) => p.id === "story-whatsapp");

  if (!flashPoster || !minimalPoster || !storyPoster) {
    return null;
  }

  const [productImg, thumbFlash, thumbMinimal, thumbStory] = await Promise.all([
    compressDataUrlForStorage(input.productImageSrc, {
      maxDim: 540,
      maxLength: 340000,
      preserveAlpha: input.isCutout,
    }),
    compressDataUrlForStorage(flashPoster.dataUrl, {
      maxDim: 380,
      maxLength: 150000,
      preserveAlpha: false,
    }),
    compressDataUrlForStorage(minimalPoster.dataUrl, {
      maxDim: 380,
      maxLength: 150000,
      preserveAlpha: false,
    }),
    compressDataUrlForStorage(storyPoster.dataUrl, {
      maxDim: 440,
      maxLength: 150000,
      preserveAlpha: false,
    }),
  ]);

  const payload = {
    shortPosterTitle:
      input.analysis.shortPosterTitle.trim().slice(0, 120) || "Création Eradiz",
    detectedCategory: input.analysis.detectedCategory.trim().slice(0, 100),
    seoTitle: input.analysis.seoTitle.trim().slice(0, 200),
    socialShortDesc: input.analysis.socialShortDesc.trim().slice(0, 600),
    price: input.price.trim().slice(0, 40),
    promoBadge: input.promoBadge.trim().slice(0, 60),
    tone: input.tone.trim().slice(0, 60),
    themeColor: normalizeHexColor(input.themeColor),
    isCutout: Boolean(input.isCutout),
    productImageSrc: productImg.slice(0, 350000),
    thumbFlashSale: thumbFlash.slice(0, 160000),
    thumbMinimalStudio: thumbMinimal.slice(0, 160000),
    thumbStoryWhatsapp: thumbStory.slice(0, 160000),
  };

  if (isFirebaseConfigured && db && user) {
    await ensureUserProfileDocument(user);
    const creationsPath = `users/${user.uid}/creations`;
    const creationsCol = collection(db, "users", user.uid, "creations");

    try {
      const docRef = await addDoc(creationsCol, {
        userId: user.uid,
        ...payload,
        createdAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        userId: user.uid,
        ...payload,
        createdAt: new Date(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, creationsPath);
    }
  }

  // Mode secours localStorage
  const localRecord: SavedCreation = {
    id: `local-${Date.now()}`,
    userId: "local",
    ...payload,
    createdAt: new Date(),
  };
  const existing = getLocalCreations();
  saveLocalCreations([localRecord, ...existing]);
  return localRecord;
}

export function subscribeToUserCreations(
  uid: string,
  onUpdate: (creations: SavedCreation[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const creationsPath = `users/${uid}/creations`;
  const creationsCol = collection(db, "users", uid, "creations");
  const q = query(creationsCol, orderBy("createdAt", "desc"), limit(24));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedCreation[] = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          userId: typeof data.userId === "string" ? data.userId : uid,
          shortPosterTitle:
            typeof data.shortPosterTitle === "string"
              ? data.shortPosterTitle
              : "Création Eradiz",
          detectedCategory:
            typeof data.detectedCategory === "string"
              ? data.detectedCategory
              : "",
          seoTitle: typeof data.seoTitle === "string" ? data.seoTitle : "",
          socialShortDesc:
            typeof data.socialShortDesc === "string" ? data.socialShortDesc : "",
          price: typeof data.price === "string" ? data.price : "",
          promoBadge:
            typeof data.promoBadge === "string" ? data.promoBadge : "",
          tone: typeof data.tone === "string" ? data.tone : "",
          themeColor:
            typeof data.themeColor === "string" ? data.themeColor : "#4F46E5",
          isCutout: Boolean(data.isCutout),
          productImageSrc:
            typeof data.productImageSrc === "string"
              ? data.productImageSrc
              : "",
          thumbFlashSale:
            typeof data.thumbFlashSale === "string" ? data.thumbFlashSale : "",
          thumbMinimalStudio:
            typeof data.thumbMinimalStudio === "string"
              ? data.thumbMinimalStudio
              : "",
          thumbStoryWhatsapp:
            typeof data.thumbStoryWhatsapp === "string"
              ? data.thumbStoryWhatsapp
              : "",
          createdAt: ts && typeof ts.toDate === "function" ? ts.toDate() : null,
        };
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, creationsPath);
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}

export async function deleteUserCreation(
  uid: string | null,
  creationId: string
): Promise<void> {
  if (isFirebaseConfigured && db && uid) {
    const docPath = `users/${uid}/creations/${creationId}`;
    const ref = doc(db, "users", uid, "creations", creationId);
    try {
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
    return;
  }

  const remaining = getLocalCreations().filter((item) => item.id !== creationId);
  saveLocalCreations(remaining);
}
