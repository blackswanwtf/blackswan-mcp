import { getFirestore, COLLECTIONS } from "./firebase.js";
import { AgentRun, AgentRunSchema } from "./types.js";

function toDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  // Firestore Timestamp has toDate()
  if (typeof timestamp === "object" && timestamp !== null && "toDate" in timestamp) {
    return (timestamp as { toDate(): Date }).toDate();
  }
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}

function parseAgentRun(doc: FirebaseFirestore.DocumentData): AgentRun | null {
  try {
    return AgentRunSchema.parse(doc);
  } catch {
    console.error(`[BlackSwan MCP] Failed to parse agent run document`);
    return null;
  }
}

export async function getLatestFlareRun(): Promise<AgentRun | null> {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.SMART_AGENT_RUNS)
    .where("agent", "==", "flare")
    .where("success", "==", true)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return parseAgentRun(snapshot.docs[0].data());
}

export async function getLatestCoreRun(): Promise<AgentRun | null> {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.SMART_AGENT_RUNS)
    .where("agent", "==", "core")
    .where("success", "==", true)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return parseAgentRun(snapshot.docs[0].data());
}

export async function getPipelineCounters(): Promise<Record<string, number>> {
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTIONS.PIPELINE_COUNTERS).get();

  const counters: Record<string, number> = {};
  for (const doc of snapshot.docs) {
    counters[doc.id] = doc.data().count ?? 0;
  }
  return counters;
}

export async function getLatestRunTimestamps(): Promise<
  Record<string, { date: Date; summary: string }>
> {
  const db = getFirestore();
  const agents = ["flare", "core", "sentinel", "crisis"] as const;
  const results: Record<string, { date: Date; summary: string }> = {};

  const queries = agents.map(async (agent) => {
    const snapshot = await db
      .collection(COLLECTIONS.SMART_AGENT_RUNS)
      .where("agent", "==", agent)
      .where("success", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      const date = toDate(data.createdAt);
      if (date) {
        let summary = "";
        if (agent === "flare" && data.output) {
          summary = `severity: ${data.output.severity?.toUpperCase() ?? "unknown"}`;
        } else if (agent === "core" && data.output) {
          summary = `environment: ${data.output.environment?.toUpperCase() ?? "unknown"}`;
        }
        results[agent] = { date, summary };
      }
    }
  });

  await Promise.all(queries);
  return results;
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
