import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getLatestFlareRun,
  getLatestCoreRun,
  formatDataAge,
} from "./firestore-client.js";
import { FlareOutputSchema, CoreOutputSchema } from "./types.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "blackswan",
    version: "0.1.0",
  });

  // ── flare ─────────────────────────────────────────────────────────────
  server.tool(
    "flare",
    "BlackSwan Flare — Precursor Detection agent. Returns the latest risk assessment from a 15-minute signal window across liquidations, funding rates, prediction markets, crypto prices, and high-urgency social intelligence. Use this for immediate, alarm-bell risk detection. Output: { status, severity (none/low/medium/high/critical), checked_at, assessment, signals[] }",
    async () => {
      try {
        const run = await getLatestFlareRun();

        if (!run) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "No recent Flare agent runs found. The system may be starting up or experiencing issues." }),
              },
            ],
            isError: true,
          };
        }

        const parseResult = FlareOutputSchema.safeParse(run.output);
        if (!parseResult.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "Failed to parse Flare output. The agent output format may have changed." }),
              },
            ],
            isError: true,
          };
        }

        const createdAt = run.createdAt?.toDate?.() ?? new Date(run.createdAt);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "flare",
                data_age: formatDataAge(createdAt),
                ...parseResult.data,
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[BlackSwan MCP] Flare tool error:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Internal error fetching Flare data." }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ── core ──────────────────────────────────────────────────────────────
  server.tool(
    "core",
    "BlackSwan Core — State Synthesis agent. Returns the latest comprehensive risk environment assessment from a 60-minute signal window across liquidations, funding rates, prediction markets, crypto prices, and social intelligence. Use this for full market context and holistic risk assessment. Output: { timestamp, environment (stable/elevated/stressed/crisis), assessment, key_factors[], sources_used[], data_freshness }",
    async () => {
      try {
        const run = await getLatestCoreRun();

        if (!run) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "No recent Core agent runs found. The system may be starting up or experiencing issues." }),
              },
            ],
            isError: true,
          };
        }

        const parseResult = CoreOutputSchema.safeParse(run.output);
        if (!parseResult.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "Failed to parse Core output. The agent output format may have changed." }),
              },
            ],
            isError: true,
          };
        }

        const createdAt = run.createdAt?.toDate?.() ?? new Date(run.createdAt);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "core",
                data_age: formatDataAge(createdAt),
                ...parseResult.data,
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[BlackSwan MCP] Core tool error:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Internal error fetching Core data." }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
