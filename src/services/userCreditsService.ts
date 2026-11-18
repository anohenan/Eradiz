import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export interface CloudUserProfile {
  uid: string;
  email: string;
  displayName: string;
  credits: number;
  activePlan: string;
}

export type UsageActionType =
  | "ai_studio_kit"
  | "video_export"
  | "image_export"
  | "calculator_session";

export interface UsageRecord {
  id: string;
  userId: string;
  actionType: UsageActionType;
  title: string;
  details: string;
  createdAt: Date | null;
}

export interface RecordUsageInput {
  actionType: UsageActionType;
  title: string;
  details: string;
}

export const INITIAL_CLOUD_CREDITS = 5;

const inFlightProfileCreations = new Map<string, Promise<void>>();

export async function ensureUserProfileDocument(
  user: User,
  explicitDisplayName?: string
): Promise<void> {
  if (!db) return;

  const existingPromise = inFlightProfileCreations.get(user.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const firestore = db;
  const userPath = `users/${user.uid}`;
  const userRef = doc(firestore, "users", user.uid);

  const task = (async () => {
    const cleanEmail = (user.email ?? "").slice(0, 320);
    const rawName =
      explicitDisplayName?.trim() ||
      user.displayName?.trim() ||
      cleanEmail.split("@")[0] ||
      "Vendeur Eradiz";
    const cleanDisplayName = rawName.slice(0, 120);

    try {
      await runTransaction(firestore, async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (snapshot.exists()) {
          return;
        }
        transaction.set(userRef, {
          email: cleanEmail,
          displayName: cleanDisplayName,
          credits: INITIAL_CLOUD_CREDITS,
          activePlan: "Découverte",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  })().finally(() => {
    inFlightProfileCreations.delete(user.uid);
  });

  inFlightProfileCreations.set(user.uid, task);
  return task;
}

export function subscribeToUserProfile(
  user: User,
  onProfileUpdate: (profile: CloudUserProfile) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, "users", user.uid);

  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        // Si le document n'existe pas encore, on le crée automatiquement avec 5 crédits
        void ensureUserProfileDocument(user).catch((err) => {
          if (onError) onError(err);
        });
        return;
      }

      const data = snapshot.data();
      const rawCredits = typeof data.credits === "number" ? data.credits : 0;

      onProfileUpdate({
        uid: user.uid,
        email: typeof data.email === "string" ? data.email : user.email || "",
        displayName:
          typeof data.displayName === "string" && data.displayName.trim()
            ? data.displayName
            : user.displayName || "Vendeur Eradiz",
        credits: Math.max(0, Math.floor(rawCredits)),
        activePlan:
          typeof data.activePlan === "string" && data.activePlan.trim()
            ? data.activePlan
            : "Découverte",
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}

export async function decrementCloudCredit(uid: string): Promise<void> {
  if (!db) return;
  const userPath = `users/${uid}`;
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      credits: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function addCloudCredits(
  uid: string,
  amount: number,
  planName?: string
): Promise<void> {
  if (!db) return;
  const safeAmount = Math.max(1, Math.min(600, Math.floor(amount)));
  const userPath = `users/${uid}`;
  const userRef = doc(db, "users", uid);

  const payload: Record<string, unknown> = {
    credits: increment(safeAmount),
    updatedAt: serverTimestamp(),
  };

  if (planName && planName.trim()) {
    payload.activePlan = planName.trim().slice(0, 64);
  }

  try {
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function recordUserUsage(
  user: User,
  input: RecordUsageInput
): Promise<void> {
  if (!db) return;

  await ensureUserProfileDocument(user);

  const usagesPath = `users/${user.uid}/usages`;
  const usagesCol = collection(db, "users", user.uid, "usages");

  const cleanTitle =
    input.title.trim().slice(0, 120) || "Création Eradiz";
  const cleanDetails = input.details.trim().slice(0, 200);

  try {
    await addDoc(usagesCol, {
      userId: user.uid,
      actionType: input.actionType,
      title: cleanTitle,
      details: cleanDetails,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, usagesPath);
  }
}

export function subscribeToUserUsages(
  uid: string,
  onUsagesUpdate: (records: UsageRecord[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  const usagesPath = `users/${uid}/usages`;
  const usagesCol = collection(db, "users", uid, "usages");
  const q = query(usagesCol, orderBy("createdAt", "desc"), limit(15));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: UsageRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | undefined;
        return {
          id: d.id,
          userId: typeof data.userId === "string" ? data.userId : uid,
          actionType:
            (data.actionType as UsageActionType) || "ai_studio_kit",
          title: typeof data.title === "string" ? data.title : "Création Eradiz",
          details: typeof data.details === "string" ? data.details : "",
          createdAt: ts && typeof ts.toDate === "function" ? ts.toDate() : null,
        };
      });
      onUsagesUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, usagesPath);
      } catch (wrapped) {
        if (onError) onError(wrapped);
      }
    }
  );
}
