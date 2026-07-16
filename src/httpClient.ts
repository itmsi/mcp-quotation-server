import axios, { AxiosError, AxiosInstance } from "axios";
import { config } from "./config.js";
import { log } from "./logger.js";
import { getToken, invalidateToken } from "./tokenManager.js";

export const http: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.timeoutMs,
});

log.info("httpClient ready", { baseURL: config.apiBaseUrl });

// Interceptor request: inject Bearer token fresh setiap request
http.interceptors.request.use(async (reqConfig) => {
  const token = await getToken();
  reqConfig.headers.Authorization = `Bearer ${token}`;
  log.info("HTTP request", {
    method: reqConfig.method?.toUpperCase(),
    url: `${reqConfig.baseURL}${reqConfig.url}`,
    hasAuth: true,
    tokenPrefix: token.substring(0, 20) + "...",
  });
  return reqConfig;
});

// Interceptor response: kalau 401 → invalidate token lalu retry sekali
http.interceptors.response.use(
  (res) => {
    log.info("HTTP response", { status: res.status, url: res.config.url });
    return res;
  },
  async (err) => {
    if (axios.isAxiosError(err)) {
      log.error("HTTP response error", {
        status: err.response?.status,
        url: err.config?.url,
        message: err.message,
      });
      // Auto-retry sekali kalau 401 (token expired)
      if (err.response?.status === 401 && !(err.config as any).__retried) {
        invalidateToken();
        const retryConfig = { ...err.config, __retried: true } as any;
        const newToken = await getToken();
        retryConfig.headers.Authorization = `Bearer ${newToken}`;
        log.info("HTTP retry after 401", { url: retryConfig.url });
        return http.request(retryConfig);
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Error yang sudah diformat rapi supaya gampang dibaca oleh model (Claude)
 * lewat isi tool result, bukan cuma stack trace mentah.
 */
export class ApiCallError extends Error {
  constructor(
    public status: number | undefined,
    public apiMessage: string,
    public details?: unknown
  ) {
    super(apiMessage);
    this.name = "ApiCallError";
  }
}

export function toApiCallError(err: unknown): ApiCallError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<any>;
    const status = axErr.response?.status;
    const data = axErr.response?.data;
    const message =
      (data && (data.error || data.message)) ||
      axErr.message ||
      "Terjadi kesalahan saat memanggil API";
    return new ApiCallError(status, message, data?.details ?? data);
  }
  return new ApiCallError(undefined, (err as Error)?.message ?? "Unknown error");
}
