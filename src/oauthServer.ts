/**
 * OAuth 2.0 Authorization Code Flow + PKCE
 * Endpoint yang dibutuhkan Claude.ai:
 *   GET  /authorize        → tampil form login / redirect dengan code
 *   POST /token            → tukar code → access_token
 *   GET  /.well-known/oauth-authorization-server  → metadata discovery
 */
import { Router, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { config } from "./config.js";
import { log } from "./logger.js";

export const oauthRouter = Router();

// In-memory store: code → { clientId, redirectUri, codeChallenge, expiresAt }
const authCodes = new Map<string, {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  expiresAt: number;
}>();

// In-memory store: access_token → { clientId, expiresAt }
const accessTokens = new Map<string, { clientId: string; expiresAt: number }>();

function cleanupExpired() {
  const now = Date.now();
  for (const [k, v] of authCodes) if (v.expiresAt < now) authCodes.delete(k);
  for (const [k, v] of accessTokens) if (v.expiresAt < now) accessTokens.delete(k);
}

// ── Discovery metadata ────────────────────────────────────────────────────────
oauthRouter.get("/.well-known/oauth-authorization-server", (_req: Request, res: Response) => {
  const base = config.oauth.serverBaseUrl;
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// ── GET /authorize ────────────────────────────────────────────────────────────
oauthRouter.get("/authorize", (req: Request, res: Response) => {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state, response_type } = req.query as Record<string, string>;

  log.info("OAuth /authorize", { client_id, redirect_uri, state });

  if (response_type !== "code") {
    res.status(400).send("unsupported_response_type");
    return;
  }

  if (client_id !== config.oauth.clientId) {
    log.error("OAuth /authorize: invalid client_id", { client_id });
    res.status(401).send("invalid_client");
    return;
  }

  if (!code_challenge) {
    res.status(400).send("code_challenge required");
    return;
  }

  // Auto-approve: langsung generate code tanpa form login
  // karena credentials sudah divalidasi via client_id
  const code = randomBytes(32).toString("hex");
  authCodes.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method ?? "S256",
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 menit
  });

  log.info("OAuth /authorize: code issued", { client_id, state });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  res.redirect(302, redirectUrl.toString());
});

// ── POST /token ───────────────────────────────────────────────────────────────
oauthRouter.post("/token", (req: Request, res: Response) => {
  cleanupExpired();

  const { grant_type, code, redirect_uri, code_verifier, client_id } = req.body as Record<string, string>;

  log.info("OAuth /token", { grant_type, client_id });

  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const stored = authCodes.get(code);
  if (!stored || stored.expiresAt < Date.now()) {
    log.error("OAuth /token: invalid or expired code");
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  if (stored.clientId !== (client_id ?? config.oauth.clientId)) {
    log.error("OAuth /token: client_id mismatch");
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  if (stored.redirectUri !== redirect_uri) {
    log.error("OAuth /token: redirect_uri mismatch");
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  // Verifikasi PKCE code_verifier
  if (stored.codeChallengeMethod === "S256") {
    const expected = createHash("sha256").update(code_verifier ?? "").digest("base64url");
    if (expected !== stored.codeChallenge) {
      log.error("OAuth /token: PKCE verification failed");
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
  }

  authCodes.delete(code);

  const accessToken = randomBytes(32).toString("hex");
  const expiresIn = 3600; // 1 jam
  accessTokens.set(accessToken, {
    clientId: stored.clientId,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  log.info("OAuth /token: access_token issued", { client_id: stored.clientId });

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
  });
});

// ── Exported validator untuk middleware /mcp ──────────────────────────────────
export function validateAccessToken(token: string): boolean {
  cleanupExpired();
  const stored = accessTokens.get(token);
  return !!stored && stored.expiresAt > Date.now();
}
