import axios, { AxiosError, AxiosInstance } from "axios";
import { config } from "./config.js";

export const http: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.timeoutMs,
  headers: {
    Authorization: `Bearer ${config.apiToken}`,
  },
});

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
