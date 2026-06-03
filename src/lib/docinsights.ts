import { config } from "./config";

/**
 * Shape of the DocInsights `/all` response:
 *   { ok: true, text, summary, classification }
 * Other endpoints (/ocr, /sum, /cls, /sumcls) have slightly different shapes,
 * so we normalise whatever comes back into a common result.
 */
export interface DocInsightsResult {
  text: string | null;
  summary: string | null;
  classification: string | null;
}

interface DocInsightsRaw {
  ok?: boolean;
  error?: string;
  details?: string;
  text?: string;
  summary?: string;
  classification?: string;
  analysis?: { summary?: string; classification_label?: string };
}

/**
 * Sends a base64-encoded document to the DocInsights API and returns the
 * normalised OCR text + summary + classification.
 *
 * @throws Error when the network call fails or the API returns an error body.
 */
export async function analyzeDocument(
  filename: string,
  base64: string,
  endpoint: string = config.docinsights.endpoint
): Promise<DocInsightsResult> {
  const url = `${config.docinsights.baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.docinsights.timeoutMs);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, base64 }),
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "AbortError"
      ? `timed out after ${config.docinsights.timeoutMs}ms`
      : err instanceof Error
      ? err.message
      : String(err);
    throw new Error(`DocInsights request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  const raw = (await resp.json().catch(() => ({}))) as DocInsightsRaw;

  if (!resp.ok || raw.error || raw.ok === false) {
    const detail = raw.details ? ` (${raw.details})` : "";
    throw new Error(`${raw.error || `HTTP ${resp.status}`}${detail}`);
  }

  return {
    text: raw.text ?? null,
    summary: raw.summary ?? raw.analysis?.summary ?? null,
    classification: raw.classification ?? raw.analysis?.classification_label ?? null,
  };
}

/** GET /health -> { ok: true } */
export async function healthCheck(): Promise<boolean> {
  try {
    const resp = await fetch(`${config.docinsights.baseUrl}/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return false;
    const body = (await resp.json().catch(() => ({}))) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}
