// =============================================================================
// FIREBASE ADMIN SERVER HELPER
// Usa Firebase Admin SDK en Google Cloud (ADC / Service Account) y hace
// fallback seguro a Firestore REST con el ID Token verificado del operador
// cuando corre localmente sin credenciales de Service Account.
// =============================================================================

import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, Firestore, Query } from 'firebase-admin/firestore';
import {
  serverGetDoc,
  serverGetDocs,
  serverAddDoc,
  serverUpdateDoc,
} from '@/lib/firestore-server';

let cachedAdminApp: App | null | undefined = undefined;
let cachedAdminDb: Firestore | null | undefined = undefined;

export function getAdminApp(): App | null {
  if (cachedAdminApp !== undefined) return cachedAdminApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedAdminApp = existing[0];
    return cachedAdminApp;
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  try {
    const rawJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      cachedAdminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      return cachedAdminApp;
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (clientEmail && privateKey && projectId) {
      cachedAdminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      return cachedAdminApp;
    }

    // Application Default Credentials (Google Cloud Run / Cloud Functions / App Hosting / gcloud ADC)
    const hasGcpAdc = Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.K_SERVICE ||
        process.env.FUNCTION_TARGET ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.FIREBASE_CONFIG
    );
    if (hasGcpAdc) {
      cachedAdminApp = initializeApp({
        credential: applicationDefault(),
        ...(projectId ? { projectId } : {}),
      });
      return cachedAdminApp;
    }
  } catch (err) {
    console.warn('[firebase-admin] Could not initialize Admin SDK, falling back to REST:', err);
  }

  cachedAdminApp = null;
  return null;
}

export function getAdminDb(): Firestore | null {
  if (cachedAdminDb !== undefined) return cachedAdminDb;
  const app = getAdminApp();
  if (!app) {
    cachedAdminDb = null;
    return null;
  }
  try {
    cachedAdminDb = getFirestore(app);
    return cachedAdminDb;
  } catch (err) {
    console.warn('[firebase-admin] getFirestore failed:', err);
    cachedAdminDb = null;
    return null;
  }
}

export async function adminAwareGetDoc(
  collectionName: string,
  docId: string,
  authToken?: string
): Promise<{ exists: boolean; data: () => any; id: string }> {
  const adminDb = getAdminDb();
  if (adminDb) {
    const snap = await adminDb.collection(collectionName).doc(docId).get();
    return {
      exists: snap.exists,
      data: () => snap.data(),
      id: snap.id,
    };
  }
  return serverGetDoc(collectionName, docId, authToken);
}

export async function adminAwareGetDocs(
  collectionName: string,
  constraints: { where?: [string, any, any][]; orderBy?: [string, any][]; limit?: number } = {},
  authToken?: string
): Promise<{ empty: boolean; docs: Array<{ id: string; data: () => any }> }> {
  const adminDb = getAdminDb();
  if (adminDb) {
    let q: Query = adminDb.collection(collectionName);
    if (constraints.where) {
      for (const [field, op, val] of constraints.where) {
        q = q.where(field, op, val);
      }
    }
    if (constraints.orderBy) {
      for (const [field, dir] of constraints.orderBy) {
        q = q.orderBy(field, dir);
      }
    }
    if (constraints.limit) {
      q = q.limit(constraints.limit);
    }
    const snap = await q.get();
    return {
      empty: snap.empty,
      docs: snap.docs.map((d) => ({
        id: d.id,
        data: () => d.data(),
      })),
    };
  }
  return serverGetDocs(collectionName, constraints, authToken);
}

export async function adminAwareAddDoc(
  collectionName: string,
  data: Record<string, any>,
  authToken?: string
): Promise<{ id: string }> {
  const adminDb = getAdminDb();
  if (adminDb) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    const ref = await adminDb.collection(collectionName).add(cleanData);
    return { id: ref.id };
  }
  return serverAddDoc(collectionName, data, authToken);
}

export async function adminAwareUpdateDoc(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  authToken?: string
): Promise<void> {
  const adminDb = getAdminDb();
  if (adminDb) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    await adminDb.collection(collectionName).doc(docId).update(cleanData);
    return;
  }
  return serverUpdateDoc(collectionName, docId, data, authToken);
}
