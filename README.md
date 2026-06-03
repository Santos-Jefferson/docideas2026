# DocInsights Organizer

An MVP web app to **organize, search and gain insights from your documents and receipts**.
Drop in a PDF or image (or forward it by email) and the app runs it through the
[DocInsights API](https://docinsightsapi.use.eks.mcap.sip.dev.cloud.synchronoss.net)
for OCR + summarization + classification, then adds a structured-extraction layer
(amount, currency, vendor/place, date) so you can search and filter like a real
expense tool.

## What it does

- **Ingest** documents two ways:
  - **Upload** from the browser (drag & drop, multi-file).
  - **Email** — forward receipts to an inbox wired to the inbound webhook.
- **Process** each document via DocInsights `/all` → OCR text, summary, classification.
- **Extract** structured fields the API doesn't return — `amount`, `currency`,
  `vendor`, `doc_date` — from the OCR text, so receipts become searchable/sortable.
- **Search** full-text across OCR text, vendor, summary and filename (SQLite FTS5),
  with filters for category, amount range, source and sort order.
- **Insights** dashboard: document counts, tracked spend, per-category totals.
- **Detail view**: inline preview (image/PDF), summary, raw OCR text, extracted
  fields, reprocess & delete.

## Tech

- **Next.js 14** (App Router, TypeScript) — UI + API routes in one app.
- **SQLite** via `better-sqlite3` with an **FTS5** full-text index.
- **Local disk** for the original files.
- No other infrastructure required — runs on one machine.

## Getting started

```bash
cp .env.example .env        # then edit values
npm install
npm run dev                 # http://localhost:3000
```

Configuration lives in `.env` (see `.env.example`). The most important value is
`DOCINSIGHTS_BASE_URL`. Because the DocInsights API is only reachable from inside
the Synchronoss internal network (SIP), run this app from a host with egress to
the EKS cluster.

Data (SQLite db + uploaded files) is written to `./data` and is **git-ignored**.

## Email ingestion (forward-to-address)

Point an inbound-email service at the webhook:

```
POST /api/email/inbound?token=YOUR_INBOUND_EMAIL_TOKEN
```

Set `INBOUND_EMAIL_TOKEN` in `.env` to a shared secret. Supported bodies:

- **multipart/form-data** — works out of the box with **SendGrid Inbound Parse**
  and **Mailgun Routes**: attachments arrive as file parts; `from`/`subject` are read.
- **application/json** — for custom forwarders:
  ```json
  { "from": "me@example.com", "subject": "Lunch receipt",
    "attachments": [{ "filename": "receipt.pdf", "base64": "JVBERi0..." }] }
  ```

Typical setup: register a domain/subdomain with the email provider, create an
inbound parse route that forwards to this endpoint, then forward (or auto-forward)
receipts to that address.

## API surface

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/documents/upload` | Multipart upload (`files`) |
| `GET`  | `/api/documents` | List/search (`q`, `classification`, `source`, `minAmount`, `maxAmount`, `sort`) |
| `GET`  | `/api/documents/:id` | Document detail (by public id) |
| `DELETE` | `/api/documents/:id` | Delete document + file |
| `GET`  | `/api/documents/:id/file` | Stream the original file |
| `POST` | `/api/documents/:id/reprocess` | Re-run the pipeline |
| `POST` | `/api/email/inbound` | Inbound email webhook |
| `GET`  | `/api/stats` | Dashboard stats |
| `GET`  | `/api/health` | App + DocInsights health |

## How field extraction works

`src/lib/extract.ts` is a dependency-free, best-effort layer:

- **Amount**: scans for monetary patterns, weighting lines that mention
  *total / amount due / balance* and lines with a currency symbol.
- **Date**: recognizes ISO, `MM/DD/YYYY`, `DD/MM/YYYY` and `Month DD, YYYY`.
- **Vendor/place**: takes the merchant name printed near the top of a receipt.

It deliberately leaves fields `null` when unsure. Swapping in an LLM-based
extractor later requires no changes elsewhere in the app.

## Roadmap / next steps

- LLM-based structured extraction for higher accuracy (line items, tax, tip).
- Authentication / multi-user accounts.
- Per-page PDF previews using DocInsights page markers (`--- Page X ---`).
- Move to Postgres + object storage for a multi-instance deployment.
- Saved searches and CSV/expense-report export.
