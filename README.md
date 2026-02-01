# BlackSwan MCP Server

Real-time crypto risk intelligence for AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/).

BlackSwan monitors crypto markets across 6 risk dimensions (Market, Event, Protocol, Regulatory, Counterparty, Contagion) using multiple data pipelines and AI agents. This MCP server exposes the latest risk assessments as tools that any MCP-compatible client can use.

## Tools

| Tool | Description |
|------|-------------|
| `check_risk` | Latest risk level from the Flare precursor detection agent — severity, signals, and assessment |
| `assess_environment` | Latest environment state from the Core synthesis agent — environment level, key factors, and sources |
| `system_status` | System health — last agent run times, severity levels, pipeline datapoint counts |

## Quick Start

```bash
# Install
npm install

# Set up credentials
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json

# Run
npm run dev
```

## Usage with Claude Desktop

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

Then ask Claude: *"What's the current crypto risk level?"* — Claude will call `check_risk`.

## Usage with MCP Inspector

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
npm run inspect
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | `oaiao-labs` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `./serviceAccountKey.json` | Path to service account key file |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | — | Alternative: service account as JSON string |
| `LOG_LEVEL` | `info` | Log level |

## Development

```bash
npm run dev        # Run with tsx (hot reload)
npm run build      # Compile TypeScript
npm start          # Run compiled version
npm run inspect    # MCP Inspector UI
```

## Architecture

```
MCP Client (Claude Desktop, OpenClaw, etc.)
        │ stdio (JSON-RPC)
        ▼
┌─────────────────┐
│  BlackSwan MCP  │──── check_risk
│  Server         │──── assess_environment
│                 │──── system_status
└────────┬────────┘
         │ Firebase Admin SDK (read-only)
         ▼
┌─────────────────┐
│  Firestore      │
│  (oaiao-labs)   │
└─────────────────┘
```

Three production dependencies: `@modelcontextprotocol/sdk`, `firebase-admin`, `zod`.
