/**
 * Smoke test — calls all MCP tools against the Risk Engine and prints output.
 *
 * Usage:
 *   RISK_ENGINE_URL=https://your-risk-engine-url \
 *   RISK_ENGINE_API_KEY=your-key npm run smoke
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./mcp-server.js";
import { validateConfig } from "./config.js";

async function main() {
  const validation = validateConfig();
  if (!validation.valid) {
    console.error("Config errors:", validation.errors);
    process.exit(1);
  }

  // Wire up MCP client <-> server in-process
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const server = createServer();
  await server.connect(serverTransport);

  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(clientTransport);

  // List tools
  const { tools } = await client.listTools();
  console.log("=".repeat(60));
  console.log("REGISTERED TOOLS");
  console.log("=".repeat(60));
  for (const tool of tools) {
    console.log(`  • ${tool.name} — ${tool.description}`);
  }

  // Call each tool
  const toolNames = ["flare", "core"];

  for (const name of toolNames) {
    console.log("\n" + "=".repeat(60));
    console.log(`TOOL: ${name}${" ".repeat(Math.max(0, 40 - name.length))}${new Date().toLocaleTimeString()}`);
    console.log("=".repeat(60));

    const result = await client.callTool({ name, arguments: {} });

    if (result.isError) {
      console.log("[ERROR]");
    }

    for (const block of result.content as { type: string; text: string }[]) {
      if (block.type === "text") {
        console.log(block.text);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SMOKE TEST COMPLETE");
  console.log("=".repeat(60));

  await client.close();
  await server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
