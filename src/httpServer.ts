#!/usr/bin/env node
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./mcpServer.js";

// ============================================================================
// VERSI TANPA AUTH — buat debugging/setup awal koneksi dulu.
// Endpoint /mcp di bawah ini TERBUKA untuk siapapun yang tahu URL-nya.
// Setelah koneksi ke Claude berhasil dan stabil, TAMBAHKAN LAGI proteksi
// (lihat komentar "TODO: auth" di bawah, atau minta saya pasang ulang).
// ============================================================================

const PORT = Number(process.env.MCP_HTTP_PORT ?? 9533);

const app = express();
app.use(express.json());

// Simpan transport per session, supaya request lanjutan pakai koneksi yang sama
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req: Request, res: Response) => {
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

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", activeSessions: Object.keys(transports).length, auth: "disabled" });
});

app.listen(PORT, () => {
  console.error(`mcp-quotation-server (HTTP) listening on port ${PORT}`);
  console.error(`  Endpoint MCP : http://localhost:${PORT}/mcp`);
  console.error(`  Health check : http://localhost:${PORT}/health`);
  console.error(
    "  PERINGATAN: server ini jalan TANPA AUTENTIKASI. Endpoint /mcp bisa diakses siapapun " +
      "yang tahu URL-nya. Pasang lagi proteksi (token/OAuth/firewall) sebelum dipakai untuk data produksi."
  );
});
