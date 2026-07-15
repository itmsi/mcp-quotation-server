import { ToolDef, JsonSchema } from "../types.js";

const islandDetailInput: JsonSchema = {
  type: "object",
  properties: {
    island_id: { type: "string", format: "uuid" },
    accessories_island_detail_quantity: { type: "integer", description: "Kuantitas untuk pulau ini, minimal 0" },
    accessories_island_detail_description: { type: "string" },
  },
};

const accessoryInputProps: Record<string, JsonSchema> = {
  accessory_part_number: { type: "string" },
  accessory_part_name: { type: "string" },
  accessory_specification: { type: "string" },
  accessory_brand: { type: "string" },
  accessory_remark: { type: "string" },
  accessory_region: { type: "string" },
  accessory_description: { type: "string" },
  accessories_island_detail: {
    type: "array",
    items: islandDetailInput,
    description: "Daftar kuantitas accessory per pulau/wilayah",
  },
};

export const accessoryTools: ToolDef[] = [
  {
    name: "list_accessories",
    description: "Ambil daftar accessory dengan pagination, pencarian, dan sorting.",
    method: "POST",
    path: "/accessory/get",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        search: { type: "string" },
        sort_by: {
          type: "string",
          enum: ["created_at", "accessory_part_number", "accessory_part_name", "accessory_brand"],
          default: "created_at",
        },
        sort_order: { type: "string", enum: ["asc", "desc"], default: "desc" },
      },
    },
  },
  {
    name: "get_accessories_by_island",
    description: "Ambil semua accessory yang tersedia untuk satu pulau/wilayah tertentu (island_id).",
    method: "GET",
    path: "/accessory/get-data-by-id-island/{idisland}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { idisland: { type: "string", format: "uuid", description: "Island UUID" } },
      required: ["idisland"],
    },
  },
  {
    name: "get_accessory",
    description: "Ambil detail satu accessory berdasarkan ID.",
    method: "GET",
    path: "/accessory/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
  {
    name: "create_accessory",
    description: "Buat accessory baru, opsional sekaligus set kuantitas per pulau.",
    method: "POST",
    path: "/accessory",
    bodyLocation: "json",
    inputSchema: { type: "object", properties: accessoryInputProps },
  },
  {
    name: "update_accessory",
    description: "Update accessory yang sudah ada.",
    method: "PUT",
    path: "/accessory/{id}",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" }, ...accessoryInputProps },
      required: ["id"],
    },
  },
  {
    name: "delete_accessory",
    description: "Hapus (soft delete) satu accessory berdasarkan ID.",
    method: "DELETE",
    path: "/accessory/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
  {
    name: "import_accessories_csv",
    description:
      "Import banyak accessory sekaligus dari file CSV lokal (maks 10MB), termasuk kuantitas per pulau (sumatera, kalimantan, sulawesi, maluku, otr). Header CSV wajib: msi_code, accessories_name, specification, brand, remarks, sumatera, kalimantan, sulawesi, maluku, otr.",
    method: "POST",
    path: "/accessory/import-csv",
    bodyLocation: "multipart",
    fileFields: ["file"],
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Path file CSV lokal di mesin tempat MCP server ini jalan" },
      },
      required: ["file"],
    },
  },
];
