import { initializeApp, cert, getApps, ServiceAccount } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, Firestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";
import { config } from "./config.js";

let firestoreInstance: Firestore | null = null;
let isInitialized = false;

export const COLLECTIONS = {
  SMART_AGENT_RUNS: "smart_agent_runs",
  PIPELINE_COUNTERS: "pipeline-counters",
} as const;

function resolveServiceAccountPath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(process.cwd(), inputPath);
}

function loadServiceAccountFromFile(
  filePath: string
): ServiceAccount | null {
  const absolutePath = resolveServiceAccountPath(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(
      `[BlackSwan MCP] Service account file not found: ${absolutePath}`
    );
    return null;
  }

  try {
    const fileContents = fs.readFileSync(absolutePath, "utf8");
    const serviceAccount = JSON.parse(fileContents);
    console.error(
      `[BlackSwan MCP] Loaded service account from: ${absolutePath}`
    );
    return serviceAccount;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[BlackSwan MCP] Failed to load service account: ${msg}`);
    return null;
  }
}

export function initializeFirebase(): void {
  if (isInitialized) return;

  let serviceAccount: ServiceAccount | null = null;

  // Option 1: JSON string from environment
  if (config.firebaseServiceAccountJson) {
    try {
      serviceAccount = JSON.parse(config.firebaseServiceAccountJson);
      console.error(
        "[BlackSwan MCP] Using credentials from JSON environment variable"
      );
    } catch {
      console.error(
        "[BlackSwan MCP] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON"
      );
    }
  }

  // Option 2: File path
  if (!serviceAccount && config.firebaseServiceAccountPath) {
    serviceAccount = loadServiceAccountFromFile(
      config.firebaseServiceAccountPath
    );
  }

  if (!serviceAccount) {
    throw new Error(
      "No Firebase service account credentials found. " +
        "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON."
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: config.firebaseProjectId,
    });
  }

  firestoreInstance = getAdminFirestore();
  firestoreInstance.settings({ ignoreUndefinedProperties: true });

  isInitialized = true;
  console.error(
    `[BlackSwan MCP] Firebase initialized (project: ${config.firebaseProjectId})`
  );
}

export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return firestoreInstance;
}
