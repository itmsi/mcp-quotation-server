#!/usr/bin/env node
import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./mcpServer.js";

const PORT = Number(process.env.MCP_HTTP_PORT ?? 3333);
// Token TERPISAH dari API_TOKEN backend — ini untuk membatasi siapa saja
// yang boleh menghubungi MCP server ini lewat network. Kalau tidak diisi,
// endpoint akan terbuka untuk siapa saja yang bisa menjangkau port ini
// (TIDAK disarankan untuk exposed ke internet tanpa reverse proxy/firewall).
const MCP_HTTP_TOKEN = process.env.MCP_HTTP_TOKEN;

const app = express();
app.use(express.json());

// Simpan transport per session, supaya request lanjutan pakai koneksi yang sama
const transports: Record<string, StreamableHTTPServerTransport> = {};

function checkAuth(req: Request, res: Response, next: NextFunction) {
  if (!MCP_HTTP_TOKEN) return next(); // auth dimatikan kalau token tidak diset
  const header = req.headers["authorization"];
  const expected = `Bearer ${MCP_HTTP_TOKEN}`;
  if (header !== expected) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: token MCP tidak valid" },
      id: null,
    });
    return;
  }
  next();
}

app.post("/mcp", checkAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // Request pertama (initialize) -> buat session baru
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: session ID tidak valid atau hilang" },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET dipakai untuk stream server->client (notifications), DELETE untuk tutup session
async function handleSessionRequest(req: Request, res: Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Session ID tidak valid atau hilang");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
}

app.get("/mcp", checkAuth, handleSessionRequest);
app.delete("/mcp", checkAuth, handleSessionRequest);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", activeSessions: Object.keys(transports).length });
});

app.listen(PORT, () => {
  console.error(`mcp-quotation-server (HTTP) listening on port ${PORT}`);
  console.error(`  Endpoint MCP : http://localhost:${PORT}/mcp`);
  console.error(`  Health check : http://localhost:${PORT}/health`);
  if (!MCP_HTTP_TOKEN) {
    console.error(
      "  PERINGATAN: MCP_HTTP_TOKEN belum diset — endpoint ini terbuka tanpa autentikasi. " +
        "Pasang reverse proxy + set MCP_HTTP_TOKEN sebelum expose ke network/internet."
    );
  }
});
