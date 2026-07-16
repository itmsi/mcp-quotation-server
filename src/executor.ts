import fs from "node:fs";
import path from "node:path";
import FormData from "form-data";
import { http, toApiCallError } from "./httpClient.js";
import { ToolDef } from "./types.js";
import { log } from "./logger.js";

function extractPathParams(urlPath: string): string[] {
  const matches = [...urlPath.matchAll(/\{(\w+)\}/g)];
  return matches.map((m) => m[1]);
}

function buildPath(def: ToolDef, args: Record<string, any>): string {
  let resolved = def.path;
  for (const param of extractPathParams(def.path)) {
    const value = args[param];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Parameter path wajib diisi: ${param}`);
    }
    resolved = resolved.replace(`{${param}}`, encodeURIComponent(String(value)));
  }
  return resolved;
}

function stripPathParams(def: ToolDef, args: Record<string, any>): Record<string, any> {
  const rest = { ...args };
  for (const param of extractPathParams(def.path)) {
    delete rest[param];
  }
  return rest;
}

/** Batas ukuran file yang boleh dibaca dari disk, untuk jaga-jaga (50MB) */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function safeReadFileForForm(form: FormData, fieldName: string, filePath: string) {
  const resolved = path.resolve(filePath);
  const stat = fs.statSync(resolved); // akan throw kalau file tidak ada
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`File terlalu besar (${fieldName}): ${resolved} melebihi batas 50MB`);
  }
  form.append(fieldName, fs.createReadStream(resolved), path.basename(resolved));
}

async function buildMultipartForm(def: ToolDef, bodyArgs: Record<string, any>): Promise<FormData> {
  const form = new FormData();
  const fileFields = new Set(def.fileFields ?? []);

  for (const [key, value] of Object.entries(bodyArgs)) {
    if (value === undefined || value === null) continue;

    if (fileFields.has(key)) {
      if (Array.isArray(value)) {
        // contoh: image_paths -> dikirim sebagai images[0], images[1], ...
        value.forEach((filePath: string, idx: number) => {
          safeReadFileForForm(form, `images[${idx}]`, filePath);
        });
        form.append("image_count", String(value.length));
      } else {
        safeReadFileForForm(form, key, String(value));
      }
      continue;
    }

    if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, String(value));
    }
  }
  return form;
}

export async function executeTool(def: ToolDef, rawArgs: unknown): Promise<unknown> {
  const args = (rawArgs ?? {}) as Record<string, any>;
  const urlPath = buildPath(def, args);
  const bodyArgs = stripPathParams(def, args);

  log.info(`API --> ${def.method} ${urlPath}`, { bodyLocation: def.bodyLocation, args: bodyArgs });

  try {
    let res;

    if (def.bodyLocation === "multipart") {
      const form = await buildMultipartForm(def, bodyArgs);
      res = await http.request({
        method: def.method,
        url: urlPath,
        data: form,
        headers: { ...form.getHeaders() },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    } else if (def.bodyLocation === "none") {
      res = await http.request({ method: def.method, url: urlPath });
    } else {
      res = await http.request({ method: def.method, url: urlPath, data: bodyArgs });
    }

    log.info(`API <-- ${res.status} ${def.method} ${urlPath}`, { data: res.data });
    return res.data;
  } catch (err) {
    const apiErr = toApiCallError(err);
    log.error(`API <-- ERROR ${def.method} ${urlPath}`, {
      status: apiErr.status,
      message: apiErr.apiMessage,
      details: apiErr.details,
    });
    throw apiErr;
  }
}
