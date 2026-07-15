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

export const config = {
  apiBaseUrl: requireEnv("API_BASE_URL").replace(/\/+$/, ""), // strip trailing slash
  apiToken: requireEnv("API_TOKEN"),
  timeoutMs: Number(process.env.API_TIMEOUT_MS ?? 30000),
};
