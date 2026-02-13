import { config } from "./config.js";

interface HistoryRun {
  id: number;
  agent: string;
  output: Record<string, unknown>;
  signal_count: number;
  model: string;
  tokens_used: number;
  cost_usd: string;
  latency_ms: number;
  created_at: string;
}

interface HistoryResponse {
  count: number;
  runs: HistoryRun[];
}

export interface LatestRun {
  output: Record<string, unknown>;
  createdAt: Date;
}

async function fetchLatestRun(agent: "flare" | "core"): Promise<LatestRun | null> {
  const url = `${config.riskEngineUrl}/api/agents/${agent}/history?limit=1`;

  const headers: Record<string, string> = {};
  if (config.riskEngineApiKey) {
    headers["X-API-Key"] = config.riskEngineApiKey;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error(
      `[BlackSwan MCP] Risk Engine ${agent}/history returned ${response.status}`
    );
    return null;
  }

  const data = (await response.json()) as HistoryResponse;
  if (data.count === 0 || !data.runs.length) return null;

  const run = data.runs[0];
  return {
    output: run.output,
    createdAt: new Date(run.created_at),
  };
}

export async function getLatestFlareRun(): Promise<LatestRun | null> {
  return fetchLatestRun("flare");
}

export async function getLatestCoreRun(): Promise<LatestRun | null> {
  return fetchLatestRun("core");
}

export function formatDataAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}
