import { initializeFirebase } from "./firebase.js";
import { validateConfig, config } from "./config.js";

async function main() {
  const validation = validateConfig();
  if (!validation.valid) {
    console.error("[BlackSwan MCP] Config errors:", validation.errors);
    process.exit(1);
  }

  initializeFirebase();

  if (config.transportMode === "http") {
    const { startHttpServer } = await import("./http-server.js");
    startHttpServer();
  } else {
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const { createServer } = await import("./mcp-server.js");
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[BlackSwan MCP] Server running on stdio");
  }
}

main().catch((err) => {
  console.error("[BlackSwan MCP] Fatal:", err);
  process.exit(1);
});
