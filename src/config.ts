export interface Config {
  firebaseProjectId: string;
  firebaseServiceAccountPath: string | null;
  firebaseServiceAccountJson: string | null;
  logLevel: string;
  transportMode: "stdio" | "http";
  port: number;
}

export const config: Config = {
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "oaiao-labs",
  firebaseServiceAccountPath:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json",
  firebaseServiceAccountJson:
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null,
  logLevel: process.env.LOG_LEVEL || "info",
  transportMode:
    process.env.TRANSPORT_MODE === "http" ? "http" : "stdio",
  port: parseInt(process.env.PORT || "3000", 10),
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.firebaseServiceAccountPath && !config.firebaseServiceAccountJson) {
    errors.push(
      "Either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON must be set"
    );
  }

  return { valid: errors.length === 0, errors };
}
