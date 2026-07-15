#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcpServer.js";

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-quotation-server berjalan lewat stdio.");
}

main().catch((err) => {
  console.error("Gagal menjalankan MCP server:", err);
  process.exit(1);
});
