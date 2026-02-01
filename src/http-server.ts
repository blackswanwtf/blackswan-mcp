import express from "express";
import cors from "cors";
import type { Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./mcp-server.js";
import { config } from "./config.js";

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "blackswan-mcp-server" });
  });

  // ── MCP endpoint (stateless) ──────────────────────────────────────────────
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = createServer();
    await server.connect(transport);

    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  });

  // ── Reject GET/DELETE on /mcp (no SSE, no sessions in stateless mode) ─────
  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      error: "Method Not Allowed",
      message: "SSE is not supported in stateless mode. Use POST.",
    });
  });

  app.delete("/mcp", (_req, res) => {
    res.status(405).json({
      error: "Method Not Allowed",
      message: "Session deletion is not supported in stateless mode.",
    });
  });

  return app;
}

export function startHttpServer(): Server {
  const app = createApp();

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.error(
      `[BlackSwan MCP] HTTP server listening on http://0.0.0.0:${config.port}`
    );
    console.error(`[BlackSwan MCP] Health: http://0.0.0.0:${config.port}/health`);
    console.error(`[BlackSwan MCP] MCP endpoint: http://0.0.0.0:${config.port}/mcp`);
  });

  return server;
}
