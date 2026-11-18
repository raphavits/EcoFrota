// Inicialização do Firebase Admin (somente servidor). As credenciais ficam em variável de ambiente.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function serviceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  // Aceita o JSON puro ou o JSON em base64 (mais fácil de colar na Vercel).
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não é um JSON válido (nem base64 de um JSON).");
  }
}

export const hasFirebase = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || process.env.FIRESTORE_EMULATOR_HOST);

let app: App | undefined;

export function getFirestoreDb() {
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const sa = serviceAccount();
      app = sa
        ? initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) })
        : initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "ecofrota-local" }); // emulador
    }
  }
  return getFirestore(app);
}
