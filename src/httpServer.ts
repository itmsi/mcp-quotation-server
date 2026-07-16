#!/usr/bin/env node
import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./mcpServer.js";
import { log } from "./logger.js";
import { config } from "./config.js";
import { oauthRouter, validateAccessToken } from "./oauthServer.js";

const PORT = Number(process.env.MCP_HTTP_PORT ?? 9533);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // untuk POST /token form body

// Register OAuth 2.0 endpoints (aktif hanya kalau OAUTH_ENABLED=true)
if (config.oauth.enabled) {
  app.use(oauthRouter);
  log.info("OAuth 2.0 endpoints registered", { baseUrl: config.oauth.serverBaseUrl });
}

const transports: Record<string, StreamableHTTPServerTransport> = {};

// ── OAuth access_token validation ─────────────────────────────────────────────────────
function checkOAuth(req: Request, res: Response, next: NextFunction) {
  if (!config.oauth.enabled) return next();

  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token || !validateAccessToken(token)) {
    log.error("OAuth rejected: invalid or missing access_token", { ip: req.ip });
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: access_token tidak valid atau expired" },
      id: null,
    });
    return;
  }

  log.info("OAuth OK", { ip: req.ip });
  next();
}
// ──────────────────────────────────────────────────────────────────────────────

app.post("/mcp", checkOAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const method = req.body?.method ?? "unknown";
  log.info(`MCP <-- ${method}`, { sessionId: sessionId ?? "(new)", body: req.body });

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
        log.info(`MCP session created`, { sessionId: newSessionId });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        log.info(`MCP session closed`, { sessionId: transport.sessionId });
        delete transports[transport.sessionId];
      }
    };

    const server = createMcpServer();
    await server.connect(transport);
  } else {
    log.error(`MCP bad request`, { sessionId, method });
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

app.get("/mcp", checkOAuth, handleSessionRequest);
app.delete("/mcp", checkOAuth, handleSessionRequest);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    activeSessions: Object.keys(transports).length,
    oauth: config.oauth.enabled ? "enabled" : "disabled",
  });
});

app.listen(PORT, () => {
  console.error(`mcp-quotation-server (HTTP) listening on port ${PORT}`);
  console.error(`  Endpoint MCP : http://localhost:${PORT}/mcp`);
  console.error(`  Health check : http://localhost:${PORT}/health`);
  console.error(`  OAuth guard  : ${config.oauth.enabled ? "ENABLED" : "DISABLED"}`);
});
