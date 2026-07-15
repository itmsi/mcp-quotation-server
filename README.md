# MCP Server — Motorsights Quotation API

MCP (Model Context Protocol) server yang membungkus REST API
`dev-api-quotation.motorsights.com` menjadi tools yang bisa dipanggil Claude:
Customer, Sales, Bank Account, Manage Quotation, Term Content, Componen
Products, dan Accessories (30 tools total).

## 1. Instalasi

Butuh **Node.js 18+**. Di server kamu:

```bash
cd mcp-quotation-server
npm install
cp .env.example .env
```

Edit `.env`:

```
API_BASE_URL=https://dev-api-quotation.motorsights.com/api/quotation
API_TOKEN=<JWT token kamu>
```

> ⚠️ `API_TOKEN` di sini statis. Kalau token JWT kamu expired secara berkala,
> lihat bagian **"Token expired"** di bawah untuk opsi lanjutan.

## 2. Build & jalankan

```bash
npm run build
npm start
```

Kalau berhasil, akan muncul log `mcp-quotation-server berjalan lewat stdio.`
di stderr. Server ini berkomunikasi lewat **stdio**, jadi tidak akan
langsung terlihat "aktif" seperti web server biasa — dia menunggu diajak
bicara oleh MCP client (Claude Desktop, Claude Code, dsb).

## 3. Menghubungkan ke Claude

### Claude Desktop / Claude Code (via SSH ke server kamu, atau server = local)

Tambahkan ke config MCP (`claude_desktop_config.json` atau setara):

```json
{
  "mcpServers": {
    "quotation": {
      "command": "node",
      "args": ["/path/absolut/ke/mcp-quotation-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://dev-api-quotation.motorsights.com/api/quotation",
        "API_TOKEN": "isi_token_jwt_kamu"
      }
    }
  }
}
```

Karena server ini kamu jalankan di **mesin terpisah**, ada 2 opsi:

### Opsi A — stdio + SSH (paling simpel, tidak perlu buka port baru)

Claude Desktop/Code men-spawn proses `node dist/index.js` lewat SSH ke server kamu:

```json
{
  "mcpServers": {
    "quotation": {
      "command": "ssh",
      "args": [
        "user@server-kamu",
        "cd /path/ke/mcp-quotation-server && node dist/index.js"
      ]
    }
  }
}
```
Env var (`API_BASE_URL`, `API_TOKEN`) taruh di `.env` **di server**, bukan di config Claude, karena proses jalan di sana.

### Opsi B — HTTP/SSE (bisa diakses dari network, tanpa SSH)

Ini opsi yang barusan ditambahkan: `src/httpServer.ts` menjalankan MCP server
yang sama lewat **Streamable HTTP transport** (Express), jadi Claude cukup
connect ke URL, tidak perlu spawn proses lokal.

```bash
npm run build
npm run start:http
# -> mcp-quotation-server (HTTP) listening on port 3333
```

Isi `.env` untuk mode ini:
```
MCP_HTTP_PORT=3333
MCP_HTTP_TOKEN=<generate token acak yang kuat, misal: openssl rand -hex 32>
```

`MCP_HTTP_TOKEN` ini **beda** dari `API_TOKEN` backend — ini kunci untuk
membatasi siapa saja yang boleh menghubungi MCP server kamu lewat network.
Kalau kosong, endpoint terbuka tanpa autentikasi (jangan dibiarkan begini
kalau server bisa diakses dari internet).

**Reverse proxy (nginx) + HTTPS — wajib kalau expose ke internet:**
```nginx
server {
    listen 443 ssl;
    server_name mcp-quotation.domain-kamu.com;

    ssl_certificate     /etc/letsencrypt/live/domain-kamu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain-kamu.com/privkey.pem;

    location /mcp {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;      # penting untuk streaming response
        proxy_read_timeout 3600s;
        proxy_set_header Host $host;
    }
}
```

**Jalankan permanen dengan systemd** (`/etc/systemd/system/mcp-quotation.service`):
```ini
[Unit]
Description=MCP Quotation Server (HTTP)
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/ke/mcp-quotation-server
EnvironmentFile=/path/ke/mcp-quotation-server/.env
ExecStart=/usr/bin/node dist/httpServer.js
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now mcp-quotation
```

**Konfigurasi di Claude** (custom/remote MCP connector) — tinggal masukkan:
- URL: `https://mcp-quotation.domain-kamu.com/mcp`
- Header: `Authorization: Bearer <MCP_HTTP_TOKEN>`

> Langkah persis di UI Claude untuk menambahkan remote MCP connector bisa
> berubah — cek `docs.claude.com` / `support.claude.com` untuk panduan
> terbaru kalau langkahnya beda dari yang kamu lihat di app.

**Health check:** `GET https://mcp-quotation.domain-kamu.com/health` (tidak
butuh auth, cuma info jumlah session aktif — cocok untuk uptime monitoring).


### Test cepat pakai MCP Inspector (rekomendasi sebelum connect ke Claude)

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Ini buka UI browser lokal buat coba tiap tool satu-satu, lihat request/response
mentahnya, sebelum dipakai beneran di Claude.

## 4. Struktur project

```
src/
├── index.ts              # entry point stdio (untuk Claude Desktop/Code lokal atau SSH)
├── httpServer.ts          # entry point HTTP/SSE (untuk akses remote via network)
├── mcpServer.ts             # factory MCP Server: daftar tools & handler call-tool (dipakai stdio & HTTP)
├── executor.ts                # generic HTTP executor: JSON body / multipart / file upload
├── httpClient.ts                # axios instance + Bearer auth otomatis + error formatting
├── config.ts                      # baca .env
├── types.ts                         # ToolDef & JsonSchema types
└── tools/
    ├── index.ts                    # registry semua tools (KURASI DI SINI)
    ├── customerSalesBank.ts        # Customer, Sales, Bank Account
    ├── manageQuotation.ts          # Manage Quotation (core, paling kompleks)
    ├── termContent.ts              # Term & Condition content
    ├── componenProduct.ts          # Componen Products (+ upload gambar & CSV import)
    └── accessory.ts                # Accessories (+ CSV import)
```

## 5. Daftar tools (30)

| Resource | Tools |
|---|---|
| Customer | `list_customers`, `get_customer` |
| Sales | `list_sales_employees`, `get_sales_employee` |
| Bank Account | `list_bank_accounts`, `get_bank_account` |
| Manage Quotation | `list_quotations`, `get_quotation`, `get_quotation_for_pdf`, `create_quotation`, `update_quotation`, `delete_quotation`, `restore_quotation`, `duplicate_quotation` |
| Term Content | `list_term_contents`, `get_term_content`, `create_term_content`, `update_term_content`, `delete_term_content` |
| Componen Products | `list_componen_products`, `get_componen_product`, `create_componen_product`, `update_componen_product`, `delete_componen_product`, `import_componen_products_csv` |
| Accessories | `list_accessories`, `get_accessories_by_island`, `get_accessory`, `create_accessory`, `update_accessory`, `delete_accessory`, `import_accessories_csv` |

## 6. Kurasi lebih lanjut

Semua tool didaftarkan di `src/tools/index.ts`. Kalau kamu mau:

- **Nonaktifkan tool tertentu** (misal `delete_quotation` supaya Claude tidak
  bisa hapus data): comment/filter dari array `allTools`.
- **Tambah validasi ekstra** sebelum request dikirim: edit `executor.ts`.
- **Ubah/perjelas deskripsi tool**: edit langsung di file tools terkait — ini
  penting supaya Claude milih tool yang tepat saat ada banyak pilihan mirip.
- **Batasi ke read-only** (aman untuk mulai): filter `allTools` supaya cuma
  method `GET` dan endpoint `*/get` yang masuk.

## 7. Catatan penting

- **File upload** (`create_componen_product`, `update_componen_product`,
  `import_componen_products_csv`, `import_accessories_csv`) butuh **path file
  lokal** di mesin tempat MCP server ini berjalan — bukan path di komputer
  kamu atau URL. Kalau Claude jalan di mesin berbeda dari server API, file
  yang mau diupload harus sudah ada di server tempat MCP ini jalan.
- **Soft delete**: sebagian besar `delete_*` adalah soft delete (`is_delete`
  flag), sesuai desain API-nya — bukan hapus permanen.
- **Token expired**: kalau token JWT kamu punya masa berlaku pendek, opsi ke
  depan: tambahkan endpoint refresh-token di `httpClient.ts` yang otomatis
  re-fetch token sebelum expired, atau pakai axios interceptor yang retry
  sekali kalau dapat 401. Bilang saja kalau mau saya tambahkan.

## 8. Troubleshooting

- **`Environment variable API_TOKEN wajib diisi`** → cek isi `.env`.
- **`API error (HTTP 401)`** → token invalid/expired, generate ulang.
- **`Parameter path wajib diisi: id`** → tool butuh argumen `id` (UUID) yang
  belum dikirim Claude; biasanya karena instruksi user kurang spesifik.
- **`Cannot find module '@modelcontextprotocol/sdk'`** → jalankan
  `npm install` dulu sebelum `npm run build`.
