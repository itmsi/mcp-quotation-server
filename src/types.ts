export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** JSON Schema minimal yang dipakai untuk inputSchema tiap tool */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number)[];
  description?: string;
  default?: unknown;
  format?: string;
  nullable?: boolean;
  additionalProperties?: boolean | JsonSchema;
}

export interface ToolDef {
  /** Nama tool yang dilihat Claude, harus unik & deskriptif */
  name: string;
  /** Deskripsi jelas supaya Claude tahu kapan pakai tool ini */
  description: string;
  method: HttpMethod;
  /** Path relatif ke API_BASE_URL, pakai {param} untuk path parameter */
  path: string;
  inputSchema: JsonSchema;
  /** Bagaimana body request dikirim */
  bodyLocation: "json" | "multipart" | "none";
  /** Untuk bodyLocation multipart: daftar field yang berisi PATH FILE LOKAL (bukan isi file) */
  fileFields?: string[];
}
