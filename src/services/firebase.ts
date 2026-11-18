import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  doc,
  getDocFromServer,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

interface FirebaseConfigShape {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Charge firebase-applet-config.json de manière sûre s'il existe dans le projet
const appletConfigModules = import.meta.glob<{
  default?: Partial<FirebaseConfigShape>;
}>("/firebase-applet-config.json", { eager: true });

function resolveFirebaseConfig(): FirebaseConfigShape | null {
  const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || "").trim();
  const envAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim();
  const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim();
  const envStorageBucket = (
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || ""
  ).trim();
  const envSenderId = (
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""
  ).trim();
  const envAppId = (import.meta.env.VITE_FIREBASE_APP_ID || "").trim();
  const envDatabaseId = (
    import.meta.env.VITE_FIREBASE_DATABASE_ID || ""
  ).trim();

  const appletModule = Object.values(appletConfigModules)[0]?.default;

  const apiKey = envApiKey || (appletModule?.apiKey || "").trim();
  const authDomain = envAuthDomain || (appletModule?.authDomain || "").trim();
  const projectId = envProjectId || (appletModule?.projectId || "").trim();
  const storageBucket =
    envStorageBucket || (appletModule?.storageBucket || "").trim();
  const messagingSenderId =
    envSenderId || (appletModule?.messagingSenderId || "").trim();
  const appId = envAppId || (appletModule?.appId || "").trim();
  const firestoreDatabaseId =
    envDatabaseId || (appletModule?.firestoreDatabaseId || "").trim();

  if (
    !apiKey ||
    !projectId ||
    !appId ||
    projectId === "remixed-project-id"
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
    messagingSenderId,
    appId,
    firestoreDatabaseId: firestoreDatabaseId || undefined,
  };
}

const resolvedConfig = resolveFirebaseConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (resolvedConfig) {
  app = initializeApp({
    apiKey: resolvedConfig.apiKey,
    authDomain: resolvedConfig.authDomain,
    projectId: resolvedConfig.projectId,
    storageBucket: resolvedConfig.storageBucket,
    messagingSenderId: resolvedConfig.messagingSenderId,
    appId: resolvedConfig.appId,
  });

  auth = getAuth(app);
  db = initializeFirestore(
    app,
    { experimentalAutoDetectLongPolling: true },
    resolvedConfig.firestoreDatabaseId || undefined
  );

  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  // Validation de connexion Firestore au démarrage
  void (async function testConnection() {
    if (!db) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("the client is offline")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          if (!db) return;
          await getDocFromServer(doc(db, "test", "connection"));
        } catch (retryError) {
          if (
            retryError instanceof Error &&
            retryError.message.includes("the client is offline")
          ) {
            console.error(
              "Impossible de joindre Cloud Firestore. Vérifiez la configuration Firebase."
            );
          }
        }
      }
    }
  })();
}

export const isFirebaseConfigured = Boolean(app && auth && db);
export { app, auth, db, googleProvider };

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function translateFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  const currentHost =
    typeof window !== "undefined" ? window.location.hostname : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "E-mail ou mot de passe incorrect.";
    case "auth/user-not-found":
      return "Aucun compte trouvé avec cette adresse e-mail.";
    case "auth/email-already-in-use":
      return "Cette adresse e-mail est déjà utilisée.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/invalid-email":
      return "Veuillez saisir une adresse e-mail valide.";
    case "auth/missing-password":
      return "Veuillez saisir votre mot de passe.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
    case "auth/popup-closed-by-user":
      return "La fenêtre de connexion Google a été fermée avant la fin.";
    case "auth/popup-blocked":
      return "La fenêtre Google a été bloquée par votre navigateur. Autorisez les fenêtres contextuelles pour ce site et réessayez.";
    case "auth/cancelled-popup-request":
      return "Une fenêtre de connexion est déjà ouverte.";
    case "auth/unauthorized-domain":
      return currentHost
        ? `Ce domaine (${currentHost}) n'est pas encore autorisé dans Firebase Console (Authentication > Paramètres > Domaines autorisés).`
        : "Ce domaine n'est pas encore autorisé dans votre console Firebase.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "Ce mode de connexion n'est pas activé dans votre console Firebase. Utilisez la connexion Google.";
    case "auth/network-request-failed":
      return "Erreur réseau. Vérifiez votre connexion internet et réessayez.";
    case "auth/internal-error":
      return "Impossible d'ouvrir la connexion Google. Vérifiez que les fenêtres contextuelles et cookies tiers ne sont pas bloqués.";
    default:
      if (code) {
        return `Impossible de finaliser l'authentification (${code}). Réessayez.`;
      }
      if (error instanceof Error && error.message) {
        return "Impossible de finaliser l'authentification. Réessayez.";
      }
      return "Une erreur d'authentification est survenue.";
  }
}
