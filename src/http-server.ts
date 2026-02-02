import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./mcp-server.js";
import { config } from "./config.js";
import {
  getLatestFlareRun,
  getLatestCoreRun,
  formatDataAge,
} from "./firestore-client.js";
import { FlareOutputSchema, CoreOutputSchema } from "./types.js";

const MAX_CONCURRENT_MCP = 20;
let activeMcpSessions = 0;

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ methods: ["GET", "POST"] }));
  app.use(express.json({ limit: "10kb" }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });

  const mcpLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "blackswan-mcp-server" });
  });

  // ── REST API endpoints ────────────────────────────────────────────────────
  app.get("/api/flare", apiLimiter, async (_req, res) => {
    try {
      const run = await getLatestFlareRun();
      if (!run) {
        res.status(503).json({ error: "No recent Flare agent runs found." });
        return;
      }
      const parseResult = FlareOutputSchema.safeParse(run.output);
      if (!parseResult.success) {
        res.status(502).json({ error: "Flare output failed schema validation." });
        return;
      }
      const createdAt = run.createdAt?.toDate?.() ?? new Date(run.createdAt);
      res.json({ agent: "flare", data_age: formatDataAge(createdAt), ...parseResult.data });
    } catch (error) {
      console.error("[BlackSwan MCP] /api/flare error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/core", apiLimiter, async (_req, res) => {
    try {
      const run = await getLatestCoreRun();
      if (!run) {
        res.status(503).json({ error: "No recent Core agent runs found." });
        return;
      }
      const parseResult = CoreOutputSchema.safeParse(run.output);
      if (!parseResult.success) {
        res.status(502).json({ error: "Core output failed schema validation." });
        return;
      }
      const createdAt = run.createdAt?.toDate?.() ?? new Date(run.createdAt);
      res.json({ agent: "core", data_age: formatDataAge(createdAt), ...parseResult.data });
    } catch (error) {
      console.error("[BlackSwan MCP] /api/core error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── MCP endpoint (stateless) ──────────────────────────────────────────────
  app.post("/mcp", mcpLimiter, async (req, res) => {
    if (activeMcpSessions >= MAX_CONCURRENT_MCP) {
      res.status(503).json({ error: "Server busy. Please try again later." });
      return;
    }

    activeMcpSessions++;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = createServer();
    await server.connect(transport);

    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      activeMcpSessions--;
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
    console.error(`[BlackSwan MCP] REST API: http://0.0.0.0:${config.port}/api/flare | /api/core`);
  });

  return server;
}
