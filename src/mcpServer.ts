import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools, findTool } from "./tools/index.js";
import { executeTool } from "./executor.js";
import { ApiCallError } from "./httpClient.js";

/**
 * Bikin instance MCP Server baru yang sudah lengkap dengan handler
 * list-tools & call-tool. Dipanggil sekali untuk stdio (index.ts),
 * atau sekali PER SESSION untuk HTTP transport (httpServer.ts) —
 * MCP session butuh Server instance sendiri-sendiri.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "mcp-quotation-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = findTool(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Tool tidak ditemukan: ${name}` }],
      };
    }

    try {
      const result = await executeTool(tool, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message =
        err instanceof ApiCallError
          ? `API error${err.status ? ` (HTTP ${err.status})` : ""}: ${err.apiMessage}${
              err.details ? `\nDetail: ${JSON.stringify(err.details)}` : ""
            }`
          : `Terjadi kesalahan: ${(err as Error).message}`;

      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  });

  return server;
}
