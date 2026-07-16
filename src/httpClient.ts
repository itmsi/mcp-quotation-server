import axios, { AxiosError, AxiosInstance } from "axios";
import { config } from "./config.js";
import { log } from "./logger.js";

export const http: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.timeoutMs,
  headers: {
    Authorization: `Bearer ${config.apiToken}`,
  },
});

// Konfirmasi token terpasang saat startup
log.info("httpClient ready", {
  baseURL: config.apiBaseUrl,
  tokenPrefix: config.apiToken.substring(0, 20) + "...",
});

// Interceptor: log Authorization header di setiap outgoing request
http.interceptors.request.use((reqConfig) => {
  const auth = reqConfig.headers?.Authorization as string | undefined;
  log.info(`HTTP request`, {
    method: reqConfig.method?.toUpperCase(),
    url: `${reqConfig.baseURL}${reqConfig.url}`,
    hasAuth: !!auth,
    tokenPrefix: auth ? auth.substring(0, 27) + "..." : "MISSING",
  });
  return reqConfig;
});

// Interceptor: log response status
http.interceptors.response.use(
  (res) => {
    log.info(`HTTP response`, {
      status: res.status,
      url: res.config.url,
    });
    return res;
  },
  (err) => {
    if (axios.isAxiosError(err)) {
      log.error(`HTTP response error`, {
        status: err.response?.status,
        url: err.config?.url,
        message: err.message,
      });
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
