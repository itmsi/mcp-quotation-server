import { ToolDef } from "../types.js";

export const termContentTools: ToolDef[] = [
  {
    name: "list_term_contents",
    description: "Ambil daftar term content (syarat & ketentuan) dengan pagination, pencarian, dan filter nama perusahaan.",
    method: "POST",
    path: "/term_content/get",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        search: { type: "string", description: "Cari berdasarkan title atau path" },
        company_name: { type: "string" },
        sort_by: { type: "string", enum: ["created_at", "term_content_title"], default: "created_at" },
        sort_order: { type: "string", enum: ["asc", "desc"], default: "desc" },
      },
    },
  },
  {
    name: "get_term_content",
    description: "Ambil detail satu term content berdasarkan ID.",
    method: "GET",
    path: "/term_content/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
  {
    name: "create_term_content",
    description: "Buat term content (syarat & ketentuan) baru.",
    method: "POST",
    path: "/term_content",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        term_content_title: { type: "string", description: "Judul term content" },
        term_content_directory: {
          type: "object",
          description: "Konten JSON, misal { title, items: ['Pembayaran ...', 'Pengiriman ...'] } (bisa object atau string JSON)",
          additionalProperties: true,
        },
        company_name: { type: "string" },
      },
      required: ["term_content_directory"],
    },
  },
  {
    name: "update_term_content",
    description: "Update term content yang sudah ada.",
    method: "PUT",
    path: "/term_content/{id}",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        term_content_title: { type: "string" },
        term_content_directory: { type: "object", additionalProperties: true },
        company_name: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_term_content",
    description: "Hapus (soft delete) satu term content berdasarkan ID.",
    method: "DELETE",
    path: "/term_content/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
];
