# BlackSwan MCP Server - Claude Context

## Purpose
Minimal MCP server that exposes BlackSwan risk intelligence as tools for Claude Desktop, OpenClaw, and other MCP clients. Reads the latest Flare and Core agent outputs from Firestore and formats them for LLM consumption.

## CRITICAL: Firestore READ-ONLY Policy

This project connects to a PRODUCTION Firestore database. All Firestore access MUST be read-only.

**NEVER use:** `.set()`, `.add()`, `.update()`, `.delete()`, `batch.commit()`, `runTransaction()`, `bulkWriter()`

**Only permitted:** `.get()`, `.where()`, `.orderBy()`, `.limit()`, `.listDocuments()`, `.listCollections()`

## Tech Stack
- Runtime: Node.js 18+ / TypeScript (ES Modules)
- MCP: @modelcontextprotocol/sdk (stdio + HTTP transport)
- HTTP: Express + cors (HTTP mode only)
- Database: Firestore (Firebase Admin SDK, read-only)
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
```

## Key Files
- `src/index.ts` — Entry point, branches on transport mode (stdio or HTTP)
- `src/config.ts` — Environment configuration + validation
- `src/firebase.ts` — Firebase Admin SDK initialization
- `src/firestore-client.ts` — Read-only Firestore queries
- `src/mcp-server.ts` — MCP server factory + tool registration
- `src/http-server.ts` — Express app for HTTP transport (stateless MCP over HTTP)
- `src/types.ts` — Zod schemas for agent run documents

## MCP Tools
| Tool | Description | Source |
|------|-------------|--------|
| `flare` | Precursor Detection — 30-min signal window, immediate risk alarm | `smart_agent_runs` (agent=flare) |
| `core` | State Synthesis — 2-4hr signal window, holistic environment assessment | `smart_agent_runs` (agent=core) |

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | `oaiao-labs` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to service account key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | Alternative: service account as JSON string |
| `TRANSPORT_MODE` | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | `3000` | HTTP server port (only used in HTTP mode) |
| `LOG_LEVEL` | `info` | Log level |

## Firestore Collections Used
| Collection | Purpose |
|------------|---------|
| `smart_agent_runs` | Agent execution history (Flare, Core, Sentinel, Crisis) |
| `pipeline-counters` | Datapoints processed per pipeline |

## Architecture
- **stdio mode** (default): MCP JSON-RPC over stdin/stdout, for local Claude Desktop usage
- **HTTP mode**: Express server with stateless MCP over HTTP POST `/mcp`, for remote deployment
- All logging to stderr (stdout reserved for MCP protocol in stdio mode)
- Three read-only tools, no mutations
- HTTP mode: each POST creates a fresh transport + server, handles request, cleans up (stateless)
- Docker deployment targets DigitalOcean App Platform (port 8080, `/health` endpoint)
