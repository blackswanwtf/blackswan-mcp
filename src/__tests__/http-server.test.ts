import { describe, it, expect, vi, afterEach } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ---------------------------------------------------------------------------
// Mock risk-engine-client — same pattern as mcp-server.test.ts
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
import { createApp } from "../http-server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = createApp();
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 with ok status", async () => {
    await startServer();

    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok", service: "blackswan-mcp-server" });
  });
});

describe("POST /mcp", () => {
  it("can list tools via MCP client", async () => {
    await startServer();

    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp`)
    );
    const client = new Client({ name: "test-http-client", version: "1.0.0" });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["core", "flare"]);

    await client.close();
  });

  it("can call flare via MCP client", async () => {
    const now = new Date();
    vi.mocked(getLatestFlareRun).mockResolvedValue({
      output: {
        status: "alert",
        severity: "high",
        checked_at: now.toISOString(),
        assessment: "BTC liquidation cascade detected.",
        signals: [
          {
            type: "major_exchange_liquidations",
            source: "derivatives_data",
            detail: "BTC liquidations $180M in 30 min",
          },
        ],
      },
      createdAt: now,
    });
    await startServer();

    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/mcp`)
    );
    const client = new Client({ name: "test-http-client", version: "1.0.0" });
    await client.connect(transport);

    const result = await client.callTool({
      name: "flare",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as { type: string; text: string }[])[0].text;
    const data = JSON.parse(text);
    expect(data.severity).toBe("high");
    expect(data.assessment).toContain("BTC liquidation cascade");

    await client.close();
  });
});

describe("GET /mcp", () => {
  it("returns 405 Method Not Allowed", async () => {
    await startServer();

    const res = await fetch(`${baseUrl}/mcp`);
    const body = await res.json();

    expect(res.status).toBe(405);
    expect(body.error).toBe("Method Not Allowed");
  });
});

describe("DELETE /mcp", () => {
  it("returns 405 Method Not Allowed", async () => {
    await startServer();

    const res = await fetch(`${baseUrl}/mcp`, { method: "DELETE" });
    const body = await res.json();

    expect(res.status).toBe(405);
    expect(body.error).toBe("Method Not Allowed");
  });
});

// ---------------------------------------------------------------------------
// REST API endpoint tests
// ---------------------------------------------------------------------------

describe("GET /api/flare", () => {
  it("returns 200 with valid flare data", async () => {
    const now = new Date();
    vi.mocked(getLatestFlareRun).mockResolvedValue({
      output: {
        status: "alert",
        severity: "high",
        checked_at: now.toISOString(),
        assessment: "BTC liquidation cascade detected.",
        signals: [
          {
            type: "major_exchange_liquidations",
            source: "derivatives_data",
            detail: "BTC liquidations $180M in 30 min",
          },
        ],
      },
      createdAt: now,
    });
    await startServer();

    const res = await fetch(`${baseUrl}/api/flare`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.agent).toBe("flare");
    expect(body.severity).toBe("high");
    expect(body.assessment).toContain("BTC liquidation cascade");
    expect(body.data_age).toBeDefined();
  });

  it("returns 503 when no runs found", async () => {
    vi.mocked(getLatestFlareRun).mockResolvedValue(null);
    await startServer();

    const res = await fetch(`${baseUrl}/api/flare`);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain("No recent Flare");
  });

  it("returns 500 when Risk Engine is unreachable", async () => {
    vi.mocked(getLatestFlareRun).mockRejectedValue(new Error("connection failed"));
    await startServer();

    const res = await fetch(`${baseUrl}/api/flare`);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});

describe("GET /api/core", () => {
  it("returns 200 with valid core data", async () => {
    const now = new Date();
    vi.mocked(getLatestCoreRun).mockResolvedValue({
      output: {
        timestamp: now.toISOString(),
        environment: "elevated",
        assessment: "Markets showing increased volatility.",
        key_factors: ["Rising VIX", "ETH funding rates negative"],
        sources_used: ["derivatives", "news", "social"],
        data_freshness: "All sources within 2 hours",
      },
      createdAt: now,
    });
    await startServer();

    const res = await fetch(`${baseUrl}/api/core`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.agent).toBe("core");
    expect(body.environment).toBe("elevated");
    expect(body.assessment).toContain("increased volatility");
    expect(body.data_age).toBeDefined();
  });

  it("returns 503 when no runs found", async () => {
    vi.mocked(getLatestCoreRun).mockResolvedValue(null);
    await startServer();

    const res = await fetch(`${baseUrl}/api/core`);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain("No recent Core");
  });

  it("returns 500 when Risk Engine is unreachable", async () => {
    vi.mocked(getLatestCoreRun).mockRejectedValue(new Error("timeout"));
    await startServer();

    const res = await fetch(`${baseUrl}/api/core`);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
