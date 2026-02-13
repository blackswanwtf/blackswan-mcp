export interface Config {
  riskEngineUrl: string;
  riskEngineApiKey: string | null;
  logLevel: string;
  transportMode: "stdio" | "http";
  port: number;
}

export const config: Config = {
  riskEngineUrl: process.env.RISK_ENGINE_URL || "",
  riskEngineApiKey: process.env.RISK_ENGINE_API_KEY || null,
  logLevel: process.env.LOG_LEVEL || "info",
  transportMode:
    process.env.TRANSPORT_MODE === "http" ? "http" : "stdio",
  port: parseInt(process.env.PORT || "3000", 10),
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.riskEngineUrl) {
    errors.push("RISK_ENGINE_URL must be set");
  }

  return { valid: errors.length === 0, errors };
}
