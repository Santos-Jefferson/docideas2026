import crypto from "crypto";
import { getDb } from "./db";
import { DocumentRow, ListFilters, Stats, DocSource } from "./types";

export interface CreateInput {
  original_name: string;
  stored_name: string;
  mime_type: string;
  ext: string;
  size: number;
  source: DocSource;
  sender_email?: string | null;
  subject?: string | null;
}

export function createDocument(input: CreateInput): DocumentRow {
  const db = getDb();
  const public_id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO documents
      (public_id, original_name, stored_name, mime_type, ext, size, source, sender_email, subject, status)
    VALUES
      (@public_id, @original_name, @stored_name, @mime_type, @ext, @size, @source, @sender_email, @subject, 'pending')
  `);
  const info = stmt.run({
    public_id,
    original_name: input.original_name,
    stored_name: input.stored_name,
    mime_type: input.mime_type,
    ext: input.ext,
    size: input.size,
    source: input.source,
    sender_email: input.sender_email ?? null,
    subject: input.subject ?? null,
  });
  return getById(Number(info.lastInsertRowid))!;
}

export function getById(id: number): DocumentRow | undefined {
  return getDb().prepare(`SELECT * FROM documents WHERE id = ?`).get(id) as DocumentRow | undefined;
}

export function getByPublicId(publicId: string): DocumentRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM documents WHERE public_id = ?`)
    .get(publicId) as DocumentRow | undefined;
}

export function setStatus(id: number, status: string, error?: string | null): void {
  getDb()
    .prepare(`UPDATE documents SET status = ?, error = ? WHERE id = ?`)
    .run(status, error ?? null, id);
}

export interface AnalysisUpdate {
  ocr_text: string | null;
  summary: string | null;
  classification: string | null;
  amount: number | null;
  currency: string | null;
  vendor: string | null;
  doc_date: string | null;
}

export function applyAnalysis(id: number, a: AnalysisUpdate): void {
  getDb()
    .prepare(
      `UPDATE documents SET
         ocr_text = @ocr_text,
         summary = @summary,
         classification = @classification,
         amount = @amount,
         currency = @currency,
         vendor = @vendor,
         doc_date = @doc_date,
         status = 'done',
         error = NULL,
         processed_at = datetime('now')
       WHERE id = @id`
    )
    .run({ id, ...a });
}

export function deleteDocument(id: number): DocumentRow | undefined {
  const row = getById(id);
  if (!row) return undefined;
  getDb().prepare(`DELETE FROM documents WHERE id = ?`).run(id);
  return row;
}

/** Escape a user query into a safe FTS5 prefix match expression. */
function toFtsQuery(q: string): string {
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t}"*`).join(" ");
}

export function listDocuments(filters: ListFilters): { rows: DocumentRow[]; total: number } {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  let from = `FROM documents d`;

  const ftsQuery = filters.q ? toFtsQuery(filters.q) : "";
  if (ftsQuery) {
    from += ` JOIN documents_fts f ON f.rowid = d.id`;
    where.push(`documents_fts MATCH @fts`);
    params.fts = ftsQuery;
  }
  if (filters.classification) {
    where.push(`d.classification = @classification`);
    params.classification = filters.classification;
  }
  if (filters.source) {
    where.push(`d.source = @source`);
    params.source = filters.source;
  }
  if (filters.status) {
    where.push(`d.status = @status`);
    params.status = filters.status;
  }
  if (typeof filters.minAmount === "number") {
    where.push(`d.amount >= @minAmount`);
    params.minAmount = filters.minAmount;
  }
  if (typeof filters.maxAmount === "number") {
    where.push(`d.amount <= @maxAmount`);
    params.maxAmount = filters.maxAmount;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  let orderSql = `ORDER BY d.created_at DESC`;
  switch (filters.sort) {
    case "oldest":
      orderSql = `ORDER BY d.created_at ASC`;
      break;
    case "amount_desc":
      orderSql = `ORDER BY d.amount DESC NULLS LAST, d.created_at DESC`;
      break;
    case "amount_asc":
      orderSql = `ORDER BY d.amount ASC NULLS LAST, d.created_at DESC`;
      break;
    default:
      if (ftsQuery) orderSql = `ORDER BY rank`; // relevance when searching
  }

  const limit = Math.min(filters.limit ?? 60, 200);
  const offset = filters.offset ?? 0;

  const total = (
    db.prepare(`SELECT COUNT(*) AS c ${from} ${whereSql}`).get(params) as { c: number }
  ).c;

  const rows = db
    .prepare(`SELECT d.* ${from} ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset }) as DocumentRow[];

  return { rows, total };
}

export function getStats(): Stats {
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM documents`).get() as { c: number }).c;

  const byStatusRows = db
    .prepare(`SELECT status, COUNT(*) AS c FROM documents GROUP BY status`)
    .all() as { status: string; c: number }[];
  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = r.c;

  const byClassification = db
    .prepare(
      `SELECT COALESCE(classification, 'unclassified') AS classification,
              COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS total_amount
       FROM documents
       WHERE status = 'done'
       GROUP BY COALESCE(classification, 'unclassified')
       ORDER BY count DESC`
    )
    .all() as { classification: string; count: number; total_amount: number }[];

  const totalAmount = (
    db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM documents`).get() as { s: number }
  ).s;

  return { total, byStatus, byClassification, totalAmount };
}
