# BlackSwan MCP Server - Claude Context

## Purpose
Minimal MCP server that exposes BlackSwan risk intelligence as tools for Claude Desktop, OpenClaw, and other MCP clients. Reads the latest Flare and Core agent outputs from the Risk Engine (Postgres-backed, hosted on DigitalOcean) via HTTP and formats them for LLM consumption.

## Data Source: Risk Engine HTTP API

This project reads agent data from the Risk Engine via its REST API. All access is read-only — it fetches the latest cached agent run, never triggers new LLM calls.

**Endpoints used:**
- `GET /api/agents/flare/history?limit=1` — latest Flare run
- `GET /api/agents/core/history?limit=1` — latest Core run

**Authentication:** `X-API-Key` header (set via `RISK_ENGINE_API_KEY` env var).

## Tech Stack
- Runtime: Node.js 18+ / TypeScript (ES Modules)
- MCP: @modelcontextprotocol/sdk (stdio + HTTP transport)
- HTTP: Express + cors (HTTP mode only)
- Data source: Risk Engine REST API (native `fetch`)
- Validation: Zod

## Commands
```bash
npm install                # Install dependencies
npm run dev                # Run with tsx (development, stdio)
npm run dev:http           # Run with tsx (development, HTTP on port 3000)
npm run build              # Compile TypeScript
npm start                  # Run compiled version (stdio)
npm start:http             # Run compiled version (HTTP)
npm run inspect            # MCP Inspector (interactive tool testing)
npm test                   # Run all tests
npm run smoke              # Smoke test against live Risk Engine
```

## Key Files
- `src/index.ts` — Entry point, branches on transport mode (stdio or HTTP)
- `src/config.ts` — Environment configuration + validation
- `src/risk-engine-client.ts` — HTTP client for Risk Engine agent history endpoints
- `src/mcp-server.ts` — MCP server factory + tool registration
- `src/http-server.ts` — Express app for HTTP transport (stateless MCP over HTTP)
- `src/types.ts` — Zod schemas for agent output validation
- `src/smoke-test.ts` — End-to-end smoke test via in-process MCP client

## MCP Tools
| Tool | Description | Source |
|------|-------------|--------|
| `flare` | Precursor Detection — 30-min signal window, immediate risk alarm | Risk Engine `/api/agents/flare/history` |
| `core` | State Synthesis — 2-4hr signal window, holistic environment assessment | Risk Engine `/api/agents/core/history` |

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `RISK_ENGINE_URL` | — (required) | Risk Engine base URL |
| `RISK_ENGINE_API_KEY` | — | API key for Risk Engine (`X-API-Key` header) |
| `TRANSPORT_MODE` | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | `3000` | HTTP server port (only used in HTTP mode) |
| `LOG_LEVEL` | `info` | Log level |

## Architecture
- **stdio mode** (default): MCP JSON-RPC over stdin/stdout, for local Claude Desktop usage
- **HTTP mode**: Express server with stateless MCP over HTTP POST `/mcp`, for remote deployment
- All logging to stderr (stdout reserved for MCP protocol in stdio mode)
- Two read-only tools, no mutations
- HTTP mode: each POST creates a fresh transport + server, handles request, cleans up (stateless)
- Docker deployment targets DigitalOcean App Platform (port 8080, `/health` endpoint)
- REST API endpoints (`/api/flare`, `/api/core`) also available in HTTP mode
