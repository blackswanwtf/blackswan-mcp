import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { LatestRun } from "../risk-engine-client.js";

// ---------------------------------------------------------------------------
// Mock risk-engine-client — keep formatDataAge real, mock HTTP queries
// ---------------------------------------------------------------------------
vi.mock("../risk-engine-client.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../risk-engine-client.js")>();
  return {
    ...actual,
    getLatestFlareRun: vi.fn(),
    getLatestCoreRun: vi.fn(),
  };
});

import {
  getLatestFlareRun,
  getLatestCoreRun,
} from "../risk-engine-client.js";
import { createServer } from "../mcp-server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFlareRun(overrides: Partial<LatestRun> = {}): LatestRun {
  const now = new Date();
  return {
    output: {
      status: "alert",
      severity: "high",
      checked_at: now.toISOString(),
      assessment:
        "Multiple correlated signals detected. BTC experiencing major liquidation cascade.",
      signals: [
        {
          type: "major_exchange_liquidations",
          source: "derivatives_data",
          detail: "BTC liquidations $180M in 30 min",
        },
        {
          type: "futures_funding_rates",
          source: "derivatives_data",
          detail: "BTC funding -0.15%, extreme negative",
        },
      ],
    },
    createdAt: now,
    ...overrides,
  };
}

function mockCoreRun(overrides: Partial<LatestRun> = {}): LatestRun {
  const now = new Date();
  return {
    output: {
      timestamp: now.toISOString(),
      environment: "elevated",
      assessment:
        "Market conditions show elevated risk due to significant BTC ETF outflows.",
      key_factors: [
        "BTC ETF recorded $500M outflows in the last 2 hours",
        "Funding rates turned negative at -0.02%",
        "Open interest remains at 90-day highs despite price decline",
      ],
      sources_used: [
        "derivatives_data",
        "social_intelligence",
        "prediction_markets",
        "news",
        "market_data",
      ],
      data_freshness: "all sources within 15 minutes",
    },
    createdAt: now,
    ...overrides,
  };
}

function parseToolOutput(result: { content: unknown }): Record<string, unknown> {
  const text = (result.content as { type: string; text: string }[])[0].text;
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Test setup — create fresh MCP client + server per test
// ---------------------------------------------------------------------------

let client: Client;
let cleanup: () => Promise<void>;

async function setup() {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const server = createServer();
  await server.connect(serverTransport);

  client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  cleanup = async () => {
    await client.close();
    await server.close();
  };
}

afterEach(async () => {
  if (cleanup) await cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tool listing", () => {
  it("exposes exactly 2 tools", async () => {
    await setup();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["core", "flare"]);
  });

  it("tools have descriptions", async () => {
    await setup();
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
    }
  });
});

// ── flare ─────────────────────────────────────────────────────────────────

describe("flare", () => {
  it("returns full JSON output for a successful Flare run", async () => {
    vi.mocked(getLatestFlareRun).mockResolvedValue(mockFlareRun());
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    expect(result.isError).toBeFalsy();
    const data = parseToolOutput(result);
    expect(data.agent).toBe("flare");
    expect(data.severity).toBe("high");
    expect(data.status).toBe("alert");
    expect(data.assessment).toContain("major liquidation cascade");
    expect(data.data_age).toBeDefined();
    expect(data.checked_at).toBeDefined();
    expect(data.signals).toEqual([
      {
        type: "major_exchange_liquidations",
        source: "derivatives_data",
        detail: "BTC liquidations $180M in 30 min",
      },
      {
        type: "futures_funding_rates",
        source: "derivatives_data",
        detail: "BTC funding -0.15%, extreme negative",
      },
    ]);
  });

  it("returns clear status when severity is none", async () => {
    vi.mocked(getLatestFlareRun).mockResolvedValue(
      mockFlareRun({
        output: {
          status: "clear",
          severity: "none",
          checked_at: new Date().toISOString(),
          assessment: "No active precursor signals detected.",
          signals: [],
        },
      })
    );
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    const data = parseToolOutput(result);
    expect(data.severity).toBe("none");
    expect(data.status).toBe("clear");
    expect(data.signals).toEqual([]);
  });

  it("returns isError when no Flare runs exist", async () => {
    vi.mocked(getLatestFlareRun).mockResolvedValue(null);
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toContain("No recent Flare agent runs found");
  });

  it("returns isError when Flare output fails schema validation", async () => {
    vi.mocked(getLatestFlareRun).mockResolvedValue(
      mockFlareRun({ output: { garbage: true } })
    );
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toContain("Failed to parse Flare output");
  });

  it("returns isError when Risk Engine is unreachable", async () => {
    vi.mocked(getLatestFlareRun).mockRejectedValue(
      new Error("Risk Engine unavailable")
    );
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toBe("Internal error fetching Flare data.");
  });
});

// ── core ──────────────────────────────────────────────────────────────────

describe("core", () => {
  it("returns full JSON output for a successful Core run", async () => {
    vi.mocked(getLatestCoreRun).mockResolvedValue(mockCoreRun());
    await setup();

    const result = await client.callTool({
      name: "core",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const data = parseToolOutput(result);
    expect(data.agent).toBe("core");
    expect(data.environment).toBe("elevated");
    expect(data.assessment).toContain("BTC ETF outflows");
    expect(data.data_age).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.key_factors).toEqual([
      "BTC ETF recorded $500M outflows in the last 2 hours",
      "Funding rates turned negative at -0.02%",
      "Open interest remains at 90-day highs despite price decline",
    ]);
    expect(data.sources_used).toContain("derivatives_data");
    expect(data.sources_used).toContain("news");
    expect(data.data_freshness).toBe("all sources within 15 minutes");
  });

  it("returns stable environment correctly", async () => {
    vi.mocked(getLatestCoreRun).mockResolvedValue(
      mockCoreRun({
        output: {
          timestamp: new Date().toISOString(),
          environment: "stable",
          assessment: "Markets are calm with no significant risk indicators.",
          key_factors: ["Low volatility across all assets"],
          sources_used: ["market_data"],
          data_freshness: "all sources within 5 minutes",
        },
      })
    );
    await setup();

    const result = await client.callTool({
      name: "core",
      arguments: {},
    });

    const data = parseToolOutput(result);
    expect(data.environment).toBe("stable");
    expect(data.assessment).toContain("Markets are calm");
  });

  it("returns isError when no Core runs exist", async () => {
    vi.mocked(getLatestCoreRun).mockResolvedValue(null);
    await setup();

    const result = await client.callTool({
      name: "core",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toContain("No recent Core agent runs found");
  });

  it("returns isError when Core output fails schema validation", async () => {
    vi.mocked(getLatestCoreRun).mockResolvedValue(
      mockCoreRun({ output: { not_valid: true } })
    );
    await setup();

    const result = await client.callTool({
      name: "core",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toContain("Failed to parse Core output");
  });

  it("returns isError when Risk Engine is unreachable", async () => {
    vi.mocked(getLatestCoreRun).mockRejectedValue(
      new Error("Permission denied")
    );
    await setup();

    const result = await client.callTool({
      name: "core",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const data = parseToolOutput(result);
    expect(data.error).toBe("Internal error fetching Core data.");
  });
});

// ── formatDataAge (unit, uses real implementation) ────────────────────────

describe("formatDataAge", () => {
  it("is used correctly in tool output", async () => {
    const threeMinAgo = new Date(Date.now() - 3 * 60_000);
    vi.mocked(getLatestFlareRun).mockResolvedValue(
      mockFlareRun({ createdAt: threeMinAgo })
    );
    await setup();

    const result = await client.callTool({ name: "flare", arguments: {} });

    const data = parseToolOutput(result);
    expect(data.data_age).toBe("3 minutes ago");
  });
});
