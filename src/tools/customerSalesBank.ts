import { ToolDef } from "../types.js";

const filterSchema = (searchDesc: string, sortEnum: string[]) => ({
  type: "object",
  properties: {
    page: { type: "integer", description: "Nomor halaman", default: 1 },
    limit: { type: "integer", description: "Jumlah item per halaman", default: 10 },
    search: { type: "string", description: searchDesc, default: "" },
    sort_by: {
      type: "string",
      enum: sortEnum,
      description: "Kolom untuk sorting",
      default: "created_at",
    },
    sort_order: {
      type: "string",
      enum: ["asc", "desc"],
      description: "Urutan sorting",
      default: "desc",
    },
  },
});

export const customerSalesBankTools: ToolDef[] = [
  // ---------- Customer ----------
  {
    name: "list_customers",
    description:
      "Ambil daftar customer dengan pagination, pencarian (nama/email/telepon), dan sorting.",
    method: "POST",
    path: "/customer/get",
    bodyLocation: "json",
    inputSchema: filterSchema("Cari berdasarkan nama, email, atau telepon", [
      "created_at",
      "name",
      "email",
      "phone",
    ]),
  },
  {
    name: "get_customer",
    description: "Ambil detail satu customer berdasarkan ID (UUID).",
    method: "GET",
    path: "/customer/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "Customer UUID" },
      },
      required: ["id"],
    },
  },

  // ---------- Sales ----------
  {
    name: "list_sales_employees",
    description:
      "Ambil daftar sales employee (dari gate_sso dblink) dengan pagination, pencarian, dan sorting.",
    method: "POST",
    path: "/sales/get",
    bodyLocation: "json",
    inputSchema: filterSchema("Cari berdasarkan nama atau email", [
      "created_at",
      "employee_name",
      "employee_email",
    ]),
  },
  {
    name: "get_sales_employee",
    description: "Ambil detail satu sales employee berdasarkan ID (UUID).",
    method: "GET",
    path: "/sales/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "Employee UUID" },
      },
      required: ["id"],
    },
  },

  // ---------- Bank Account ----------
  {
    name: "list_bank_accounts",
    description:
      "Ambil daftar bank account dengan pagination, pencarian (nama/nomor/tipe rekening), dan sorting.",
    method: "POST",
    path: "/bank-account/get",
    bodyLocation: "json",
    inputSchema: filterSchema("Cari berdasarkan nama, nomor, atau tipe rekening", [
      "created_at",
      "bank_account_name",
      "bank_account_number",
      "bank_account_type",
    ]),
  },
  {
    name: "get_bank_account",
    description: "Ambil detail satu bank account berdasarkan ID (UUID).",
    method: "GET",
    path: "/bank-account/{id}",
    bodyLocation: "none",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", description: "Bank Account UUID" },
      },
      required: ["id"],
    },
  },
];
