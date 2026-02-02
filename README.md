# BlackSwan MCP Server

Real-time crypto risk intelligence for AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/).

BlackSwan monitors crypto markets across 6 risk dimensions (Market, Event, Protocol, Regulatory, Counterparty, Contagion) using multiple data pipelines and AI agents. This MCP server exposes the latest risk assessments as tools that any MCP-compatible client can use.

## Tools

| Tool | Description |
|------|-------------|
| `flare` | Precursor Detection — 30-min signal window for immediate risk alarm (severity, signals, assessment) |
| `core` | State Synthesis — 2-4hr signal window for holistic environment assessment (environment level, key factors, sources) |

## Remote Usage (HTTP)

Point any MCP client at the hosted endpoint:

```
https://blackswanmcp-app-pu6a3.ondigitalocean.app/mcp
```

No credentials needed — the server holds the Firestore service account key.

## Local Usage (stdio)

```bash
npm install
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
npm run dev
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blackswan": {
      "command": "npx",
      "args": ["tsx", "/path/to/blackswan-mcp-server/src/index.ts"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT_PATH": "/path/to/serviceAccountKey.json"
      }
    }
  }
}
```

Then ask Claude: *"What does Flare say about current crypto risk?"*

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | `oaiao-labs` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to service account key file |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | Alternative: service account as JSON string |
| `TRANSPORT_MODE` | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | `3000` | HTTP server port (Docker default: 8080) |
| `LOG_LEVEL` | `info` | Log level |

## Development

```bash
npm run dev        # stdio mode (local)
npm run dev:http   # HTTP mode (port 3000)
npm run build      # Compile TypeScript
npm start          # Run compiled (stdio)
npm start:http     # Run compiled (HTTP)
npm test           # Run tests
npm run inspect    # MCP Inspector UI
```

## Architecture

```
MCP Client (Claude Desktop, OpenClaw, etc.)
        │
        ├── stdio (local)
        └── HTTP POST /mcp (remote)
                │
                ▼
       ┌─────────────────┐
       │  BlackSwan MCP   │──── flare
       │  Server          │──── core
       └────────┬─────────┘
                │ Firebase Admin SDK (read-only)
                ▼
       ┌─────────────────┐
       │  Firestore       │
       │  (oaiao-labs)    │
       └─────────────────┘
```
