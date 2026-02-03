# BlackSwan MCP Server

Real-time crypto risk intelligence via the [Model Context Protocol](https://modelcontextprotocol.io/). Two AI agents monitor what's happening 24/7 — before news breaks, as it breaks, and why it happened. Enables agents to have real-time risk intelligence and awareness, not yesterday's news.

## Tools

| Tool | What it answers |
|------|----------------|
| **Flare** | "Is something happening right now?" — Precursor detection from a 15-minute signal window |
| **Core** | "What's the overall risk environment?" — State synthesis from a 60-minute signal window |

## Connect

### MCP

Point any MCP client at:

```
https://mcp.blackswan.wtf/mcp
```

No API key required.

### REST API

```bash
curl -s https://mcp.blackswan.wtf/api/flare
curl -s https://mcp.blackswan.wtf/api/core
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blackswan": {
      "type": "http",
      "url": "https://mcp.blackswan.wtf/mcp"
    }
  }
}
```

Then ask Claude: *"What does Flare say about current crypto risk?"*

## Response Format

### Flare

| Field | Description |
|-------|-------------|
| `agent` | Always `"flare"` |
| `data_age` | Human-readable age (e.g. "12 minutes ago") |
| `status` | `"clear"` or `"alert"` |
| `severity` | `"none"`, `"low"`, `"medium"`, `"high"`, or `"critical"` |
| `checked_at` | ISO 8601 timestamp |
| `assessment` | Natural language risk assessment |
| `signals` | Array of detected signals with `type`, `source`, and `detail` |

### Core

| Field | Description |
|-------|-------------|
| `agent` | Always `"core"` |
| `data_age` | Human-readable age (e.g. "1 hour ago") |
| `timestamp` | ISO 8601 timestamp |
| `environment` | `"stable"`, `"elevated"`, `"stressed"`, or `"crisis"` |
| `assessment` | Natural language risk assessment |
| `key_factors` | Array of main risk factors |
| `sources_used` | Data sources used in the assessment |
| `data_freshness` | How fresh the underlying data is |

## Interpreting Results

### Flare Severity

| Level | Meaning |
|-------|---------|
| `none` | No precursors detected, markets quiet |
| `low` | Minor signals, worth noting but not actionable |
| `medium` | Notable signals, warrants attention |
| `high` | Strong precursors, elevated risk of sudden moves |
| `critical` | Extreme signals, immediate risk of major event |

### Core Environment

| Level | Meaning |
|-------|---------|
| `stable` | Normal conditions, low systemic risk |
| `elevated` | Above-normal risk, some stress indicators |
| `stressed` | Significant stress across multiple indicators |
| `crisis` | Severe market stress, active dislocation or contagion |

## Error Responses

| HTTP Status | Meaning |
|-------------|---------|
| `200` | Success |
| `502` | Agent output failed validation |
| `503` | No recent agent runs — system may be starting up |
| `500` | Unexpected server error |

Non-200 responses return `{"error": "..."}` with a human-readable message.

## License

MIT
