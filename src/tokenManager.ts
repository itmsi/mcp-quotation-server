import axios from "axios";
import { config } from "./config.js";
import { log } from "./logger.js";

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let cache: TokenCache | null = null;

async function fetchToken(): Promise<string> {
  log.info("tokenManager: fetching new token from SSO...");
  const res = await axios.post(
    config.authUrl,
    { email: config.authEmail, password: config.authPassword },
    { headers: { "Content-Type": "application/json", accept: "application/json" }, timeout: 15000 }
  );

  const token: string = res.data?.data?.oauth?.sso_token;
  if (!token) {
    throw new Error(`SSO login gagal: sso_token tidak ditemukan di response. Data: ${JSON.stringify(res.data)}`);
  }

  // Decode exp dari JWT payload (tanpa verifikasi signature)
  let expiresAt = Date.now() + 60 * 60 * 1000; // fallback: 1 jam
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload.exp) expiresAt = payload.exp * 1000;
  } catch {
    // biarkan pakai fallback
  }

  cache = { token, expiresAt };
  log.info("tokenManager: token fetched", {
    tokenPrefix: token.substring(0, 20) + "...",
    expiresAt: new Date(expiresAt).toISOString(),
  });
  return token;
}

/** Ambil token dari cache, fetch baru kalau belum ada atau sudah expired (buffer 60 detik) */
export async function getToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.token;
  }
  return fetchToken();
}

/** Paksa invalidate cache (dipanggil saat dapat 401) */
export function invalidateToken(): void {
  log.info("tokenManager: token invalidated (will re-fetch on next request)");
  cache = null;
}
