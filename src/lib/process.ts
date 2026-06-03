import { analyzeDocument } from "./docinsights";
import { extractFields } from "./extract";
import { fileBuffer } from "./storage";
import { applyAnalysis, getById, setStatus } from "./repo";

// Tracks in-flight document ids so we don't process the same one twice.
const inFlight = new Set<number>();

/**
 * Runs the full pipeline for a single document:
 *   1. read file from disk -> base64
 *   2. call DocInsights for OCR text + summary + classification
 *   3. derive structured fields (amount / vendor / date) from the OCR text
 *   4. persist everything and mark the document "done" (or "error")
 *
 * Safe to call fire-and-forget; it never throws.
 */
export async function processDocument(id: number): Promise<void> {
  if (inFlight.has(id)) return;
  inFlight.add(id);
  try {
    const doc = getById(id);
    if (!doc) return;

    setStatus(id, "processing");

    const buf = fileBuffer(doc.stored_name);
    const base64 = buf.toString("base64");

    const result = await analyzeDocument(doc.original_name, base64);
    const fields = extractFields(result.text);

    applyAnalysis(id, {
      ocr_text: result.text,
      summary: result.summary,
      classification: result.classification ? result.classification.trim() : null,
      amount: fields.amount,
      currency: fields.currency,
      vendor: fields.vendor,
      doc_date: fields.doc_date,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(id, "error", message.slice(0, 1000));
  } finally {
    inFlight.delete(id);
  }
}

/** Kick off processing without blocking the request. */
export function processInBackground(id: number): void {
  void processDocument(id);
}
