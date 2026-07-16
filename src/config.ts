import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} wajib diisi. Cek file .env kamu (lihat .env.example).`
    );
  }
  return value;
}

const oauthEnabled = process.env.OAUTH_ENABLED === "true";

export const config = {
  apiBaseUrl: requireEnv("API_BASE_URL").replace(/\/+$/, ""),
  authUrl: requireEnv("AUTH_URL"),
  authEmail: requireEnv("AUTH_EMAIL"),
  authPassword: requireEnv("AUTH_PASSWORD"),
  timeoutMs: Number(process.env.API_TIMEOUT_MS ?? 30000),
  oauth: {
    enabled: oauthEnabled,
    clientId: oauthEnabled ? requireEnv("OAUTH_CLIENT_ID") : "",
    clientSecret: oauthEnabled ? requireEnv("OAUTH_CLIENT_SECRET") : "",
    serverBaseUrl: (process.env.OAUTH_SERVER_BASE_URL ?? "").replace(/\/+$/, ""),
  },
};
