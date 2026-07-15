import { ToolDef, JsonSchema } from "../types.js";

const itemAccessoryInput: JsonSchema = {
  type: "object",
  description: "Accessory yang disertakan dalam satu item quotation",
  properties: {
    accessory_id: { type: "string", format: "uuid", description: "ID accessory (wajib)" },
    quantity: { type: "integer", description: "Jumlah accessory (wajib, minimal 0)" },
    description: { type: "string", description: "Catatan tambahan (opsional)" },
  },
  required: ["accessory_id", "quantity"],
};

const itemSpecificationInput: JsonSchema = {
  type: "object",
  description: "Spesifikasi tambahan untuk satu item quotation",
  properties: {
    componen_product_id: { type: "string", format: "uuid" },
    manage_quotation_item_specification_label: { type: "string", description: "Contoh: 'Model'" },
    manage_quotation_item_specification_value: { type: "string", description: "Contoh: 'SX32434534534'" },
  },
};

const quotationItemInput: JsonSchema = {
  type: "object",
  description: "Satu baris item/produk dalam quotation",
  properties: {
    componen_product_id: { type: "string", format: "uuid", description: "Referensi ke componen product" },
    code_unique: { type: "string" },
    segment: { type: "string" },
    msi_model: { type: "string" },
    msi_product: { type: "string" },
    wheel_no: { type: "string" },
    engine: { type: "string" },
    volume: { type: "string" },
    horse_power: { type: "string" },
    market_price: { type: "string" },
    componen_product_name: { type: "string" },
    quantity: { type: "integer", description: "Jumlah unit" },
    price: { type: "string", description: "Harga satuan" },
    total: { type: "string", description: "Total harga (quantity x price)" },
    description: { type: "string" },
    order_number: { type: "integer", description: "Urutan tampil item", default: 0 },
    manage_quotation_item_accessories: { type: "array", items: itemAccessoryInput },
    manage_quotation_item_specifications: { type: "array", items: itemSpecificationInput },
  },
};

const quotationInputProperties: Record<string, JsonSchema> = {
  customer_id: { type: "string", format: "uuid", description: "ID customer (wajib)" },
  employee_id: { type: "string", format: "uuid", description: "ID sales employee (wajib)" },
  island_id: { type: "string", format: "uuid", description: "ID pulau/wilayah pengiriman" },
  manage_quotation_date: { type: "string", format: "date", description: "Tanggal quotation, format YYYY-MM-DD" },
  manage_quotation_valid_date: { type: "string", format: "date", description: "Tanggal berlaku sampai, format YYYY-MM-DD" },
  manage_quotation_grand_total: { type: "number", description: "Total akhir" },
  manage_quotation_grand_total_before: { type: "number", description: "Total sebelum mutasi" },
  manage_quotation_mutation_type: { type: "string", enum: ["plus", "minus"], description: "Jenis mutasi" },
  manage_quotation_mutation_nominal: { type: "number" },
  manage_quotation_ppn: { type: "string", description: "Nominal PPN" },
  manage_quotation_delivery_fee: { type: "string", description: "Biaya kirim" },
  manage_quotation_other: { type: "string", description: "Biaya lain-lain" },
  manage_quotation_payment_presentase: { type: "string", description: "Persentase pembayaran/DP" },
  manage_quotation_payment_nominal: { type: "number", description: "Nominal pembayaran/DP" },
  manage_quotation_description: { type: "string" },
  manage_quotation_shipping_term: { type: "string" },
  manage_quotation_franco: { type: "string" },
  manage_quotation_lead_time: { type: "string" },
  bank_account_id: { type: "string", format: "uuid" },
  bank_account_name: { type: "string", description: "Nama pemilik rekening" },
  bank_account_number: { type: "string" },
  bank_account_bank_name: { type: "string" },
  term_content_id: { type: "string", format: "uuid", description: "Referensi ke term_content (opsional, hanya acuan)" },
  term_content_directory: {
    type: "object",
    description: "Konten JSON term & condition yang akan disimpan (object atau string JSON), misal { title, items: [...] }",
    additionalProperties: true,
  },
  status: { type: "string", enum: ["draft", "submit"], default: "submit" },
  include_aftersales_page: { type: "boolean", default: false },
  include_msf_page: { type: "boolean", default: false },
  company: { type: "string" },
  project_id: { type: "string" },
  quotation_for: { type: "string", description: "Nama customer/tujuan quotation" },
  star: { type: "string", description: "Rating bintang, contoh '5'" },
  manage_quotation_items: { type: "array", items: quotationItemInput, description: "Daftar item/produk dalam quotation" },
};

export const manageQuotationTools: ToolDef[] = [
  {
    name: "list_quotations",
    description:
      "Ambil daftar manage quotation dengan filter status (draft/submit/reject), island, customer, rentang tanggal, pencarian, dan pagination.",
    method: "POST",
    path: "/manage-quotation/get",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "integer", default: 1 },
        limit: { type: "integer", default: 10 },
        search: { type: "string", description: "Cari nomor quotation, customer_id, atau employee_id" },
        sort_by: {
          type: "string",
          enum: ["created_at", "manage_quotation_no", "manage_quotation_date", "manage_quotation_valid_date"],
          default: "created_at",
        },
        sort_order: { type: "string", enum: ["asc", "desc"], default: "desc" },
        status: { type: "string", enum: ["draft", "submit", "reject", ""], description: "Kosongkan untuk semua status" },
        island_id: { type: "string", description: "Filter berdasarkan island_id, kosongkan untuk semua" },
        quotation_for: { type: "string" },
        start_date: { type: "string", format: "date", description: "Filter created_at mulai, YYYY-MM-DD" },
        end_date: { type: "string", format: "date", description: "Filter created_at sampai, YYYY-MM-DD" },
        customer_id: { type: "string" },
        company_name: { type: "string" },
      },
    },
  },
  {
    name: "get_quotation",
    description: "Ambil detail lengkap satu manage quotation (termasuk items) berdasarkan ID.",
    method: "GET",
    path: "/manage-quotation/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Manage Quotation UUID" } },
      required: ["id"],
    },
  },
  {
    name: "get_quotation_for_pdf",
    description: "Ambil data quotation yang diformat khusus untuk keperluan generate PDF.",
    method: "GET",
    path: "/manage-quotation/pdf/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Manage Quotation UUID" } },
      required: ["id"],
    },
  },
  {
    name: "create_quotation",
    description: "Buat manage quotation baru beserta item-itemnya.",
    method: "POST",
    path: "/manage-quotation",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: quotationInputProperties,
      required: ["customer_id", "employee_id", "manage_quotation_date", "manage_quotation_valid_date"],
    },
  },
  {
    name: "update_quotation",
    description: "Update manage quotation yang sudah ada (termasuk replace daftar item-nya).",
    method: "PUT",
    path: "/manage-quotation/{id}",
    bodyLocation: "json",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Manage Quotation UUID" }, ...quotationInputProperties },
      required: ["id"],
    },
  },
  {
    name: "delete_quotation",
    description: "Hapus (soft delete) satu manage quotation berdasarkan ID.",
    method: "DELETE",
    path: "/manage-quotation/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Manage Quotation UUID" } },
      required: ["id"],
    },
  },
  {
    name: "restore_quotation",
    description: "Kembalikan (restore) manage quotation yang sebelumnya sudah di-soft-delete.",
    method: "POST",
    path: "/manage-quotation/{id}/restore",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid", description: "Manage Quotation UUID" } },
      required: ["id"],
    },
  },
  {
    name: "duplicate_quotation",
    description:
      "Duplikat manage quotation beserta semua item, accessory, dan spesifikasinya. Hasil duplikat berstatus draft dengan nomor quotation baru.",
    method: "POST",
    path: "/manage-quotation/duplikat/{manage_quotation_id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: { manage_quotation_id: { type: "string", format: "uuid", description: "Manage Quotation UUID yang akan diduplikat" } },
      required: ["manage_quotation_id"],
    },
  },
];
