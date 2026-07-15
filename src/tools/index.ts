import { ToolDef } from "../types.js";
import { customerSalesBankTools } from "./customerSalesBank.js";
import { manageQuotationTools } from "./manageQuotation.js";
import { termContentTools } from "./termContent.js";
import { componenProductTools } from "./componenProduct.js";
import { accessoryTools } from "./accessory.js";

// ============================================================================
// KURASI DI SINI: kalau kamu mau nonaktifkan tool tertentu (misal endpoint
// admin/berbahaya), tinggal comment-out atau filter dari array ini.
// Tambah tool baru tinggal push ToolDef baru ke salah satu file di folder ini.
// ============================================================================
export const allTools: ToolDef[] = [
  ...customerSalesBankTools,
  ...manageQuotationTools,
  ...termContentTools,
  ...componenProductTools,
  ...accessoryTools,
];

export function findTool(name: string): ToolDef | undefined {
  return allTools.find((t) => t.name === name);
}

// Validasi nama tool unik (jaga-jaga kalau ada typo waktu nambah tool baru)
const seen = new Set<string>();
for (const tool of allTools) {
  if (seen.has(tool.name)) {
    throw new Error(`Duplicate tool name terdeteksi: ${tool.name}`);
  }
  seen.add(tool.name);
}
