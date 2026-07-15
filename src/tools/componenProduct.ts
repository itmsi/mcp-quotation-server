import { ToolDef, JsonSchema } from "../types.js";

const componenProductInputProps: Record<string, JsonSchema> = {
  componen_type: {
    type: "integer",
    enum: [1, 2, 3, 4, 5],
    description: "1=OFF ROAD REGULAR, 2=ON ROAD REGULAR, 3=OFF ROAD IRREGULAR, 4=OFF ROAD REGULAR EV, 5=ON ROAD REGULAR EV",
  },
  company_name: { type: "string" },
  product_type: { type: "string", description: "unit, non_unit, hardware, implementation, atau application" },
  componen_product_name: { type: "string" },
  code_unique: { type: "string" },
  segment: { type: "string" },
  msi_model: { type: "string" },
  msi_product: { type: "string" },
  wheel_no: { type: "string" },
  engine: { type: "string" },
  horse_power: { type: "string" },
  componen_product_unit_model: { type: "string" },
  volume: { type: "string" },
  market_price: { type: "string" },
  selling_price_star_1: { type: "string" },
  selling_price_star_2: { type: "string" },
  selling_price_star_3: { type: "string" },
  selling_price_star_4: { type: "string" },
  selling_price_star_5: { type: "string" },
  componen_product_description: { type: "string" },
  componen_product_specifications: {
    type: "string",
    description:
      "String JSON array spesifikasi, contoh: [{\"componen_product_specification_label\":\"Horse Power\",\"componen_product_specification_value\":\"200 HP\"}]",
  },
  image_paths: {
    type: "array",
    items: { type: "string" },
    description:
      "Daftar PATH FILE LOKAL gambar produk (bukan URL) di server tempat MCP ini berjalan, contoh ['/data/images/foto1.jpg']. Maksimal 50 file, kosongkan jika tidak upload gambar baru.",
  },
};

export const componenProductTools: ToolDef[] = [
  {
    name: "list_componen_products",
    description:
      "Ambil daftar componen product (produk/unit) dengan pagination, pencarian, sorting, dan filter company_name/product_type.",
    method: "POST",
    path: "/componen_product/get",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        search: { type: "string" },
        sort_by: {
          type: "string",
          enum: [
            "created_at",
            "code_unique",
            "componen_product_name",
            "segment",
            "msi_model",
            "msi_product",
            "volume",
            "componen_product_unit_model",
          ],
          default: "created_at",
        },
        sort_order: { type: "string", enum: ["asc", "desc"], default: "desc" },
        company_name: { type: "string", description: "Filter nama perusahaan (boleh kosong)" },
        product_type: { type: "string", description: "unit, non_unit, hardware, implementation, application" },
      },
    },
  },
  {
    name: "get_componen_product",
    description: "Ambil detail satu componen product berdasarkan ID (termasuk gambar & spesifikasi).",
    method: "GET",
    path: "/componen_product/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
  {
    name: "create_componen_product",
    description:
      "Buat componen product baru. Untuk upload gambar, isi image_paths dengan path file lokal (di mesin tempat MCP server ini jalan).",
    method: "POST",
    path: "/componen_product",
    bodyLocation: "multipart",
    fileFields: ["image_paths"],
    inputSchema: {
      type: "object",
      properties: componenProductInputProps,
    },
  },
  {
    name: "update_componen_product",
    description:
      "Update componen product yang sudah ada. Gambar baru (image_paths) akan ditambahkan ke gambar yang sudah ada, tidak menggantikannya. Untuk menghapus gambar lama, gunakan tool hapus gambar terpisah jika tersedia, atau update lewat dashboard.",
    method: "PUT",
    path: "/componen_product/{id}",
    bodyLocation: "multipart",
    fileFields: ["image_paths"],
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" }, ...componenProductInputProps },
      required: ["id"],
    },
  },
  {
    name: "delete_componen_product",
    description: "Hapus (soft delete) satu componen product berdasarkan ID.",
    method: "DELETE",
    path: "/componen_product/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
    },
  },
  {
    name: "import_componen_products_csv",
    description:
      "Import banyak componen product sekaligus dari file CSV lokal (maks 10MB). Header CSV wajib: msi_code, truck_type, segment, segment_type, msi_model, unit_model, engine, horse_power, wheel_number, volume_cbm, market_price, gvw, wheelbase, engine_brand_model, max_torque, displacement, emission_standard, engine_guard, gearbox_transmission, fuel_tank, Tyre.",
    method: "POST",
    path: "/componen_product/import-csv",
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
