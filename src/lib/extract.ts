/**
 * Heuristic structured-field extraction.
 *
 * The DocInsights API returns OCR text + a free-text summary + a classification
 * label, but NOT structured fields like amount / vendor / date. Those are what
 * make documents searchable and sortable ("show me receipts over $50",
 * "what did I spend at Starbucks"), so we derive them here from the OCR text.
 *
 * This is intentionally simple and dependency-free. It is a best-effort layer:
 * fields it can't confidently find are left null. It can later be upgraded to an
 * LLM-based extractor without changing the rest of the app.
 */

export interface Extracted {
  amount: number | null;
  currency: string | null;
  vendor: string | null;
  doc_date: string | null; // ISO yyyy-mm-dd
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
};

const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "INR", "CAD", "AUD", "CHF", "CNY", "BRL"];

// Lines that look like the grand total are weighted highest.
const TOTAL_KEYWORDS =
  /\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total|amount|subtotal|paid)\b/i;

interface MoneyMatch {
  value: number;
  currency: string | null;
  weight: number;
}

function parseNumber(raw: string): number | null {
  // Normalise "1,234.56" and "1.234,56" style numbers to a float.
  let s = raw.replace(/\s/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // comma is the decimal separator (European style)
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // dot is the decimal separator
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function detectCurrency(context: string): string | null {
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (context.includes(sym)) return code;
  }
  for (const code of CURRENCY_CODES) {
    if (new RegExp(`\\b${code}\\b`).test(context)) return code;
  }
  return null;
}

/** Pull the most likely monetary amount + currency from OCR text. */
export function extractAmount(text: string): { amount: number | null; currency: string | null } {
  const lines = text.split(/\r?\n/);
  const matches: MoneyMatch[] = [];

  // Matches numbers that look monetary: $1,234.56  1.234,56  45.00  etc.
  const moneyRe = /(?:[$€£¥₹]\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2}))/g;

  for (const line of lines) {
    const isTotalLine = TOTAL_KEYWORDS.test(line);
    let m: RegExpExecArray | null;
    moneyRe.lastIndex = 0;
    while ((m = moneyRe.exec(line)) !== null) {
      const value = parseNumber(m[1]);
      if (value === null || value <= 0 || value > 100_000_000) continue;
      // Require a decimal or a currency indicator to avoid matching counts / phone numbers.
      const hasDecimal = /[.,]\d{1,2}$/.test(m[1]);
      const currency = detectCurrency(line);
      if (!hasDecimal && !currency && !isTotalLine) continue;

      let weight = value; // larger amounts are usually the total
      if (isTotalLine) weight += 1_000_000; // strongly prefer lines mentioning "total"
      if (/grand\s*total|total\s*due|amount\s*due|balance\s*due/i.test(line)) weight += 2_000_000;
      if (currency) weight += 1000;
      matches.push({ value, currency, weight });
    }
  }

  if (matches.length === 0) return { amount: null, currency: null };
  matches.sort((a, b) => b.weight - a.weight);
  const best = matches[0];
  return { amount: best.value, currency: best.currency ?? detectCurrency(text) };
}

/** Best-effort document date in ISO format. */
export function extractDate(text: string): string | null {
  const candidates: string[] = [];

  // 2026-05-13 / 2026/05/13
  const iso = /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g;
  // 05/13/2026 or 13/05/2026 or 05-13-26
  const dmy = /\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d{2}|\d{2})\b/g;
  const mdy = /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](20\d{2}|\d{2})\b/g;
  // 13 May 2026 / May 13, 2026
  const monthName =
    /\b(\d{1,2}\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2},?\s+)?(20\d{2})\b/gi;

  let m: RegExpExecArray | null;
  while ((m = iso.exec(text)) !== null) {
    const iso2 = toIso(+m[1], +m[2], +m[3]);
    if (iso2) candidates.push(iso2);
  }
  if (candidates.length === 0) {
    while ((m = mdy.exec(text)) !== null) {
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      const iso2 = toIso(y, +m[1], +m[2]);
      if (iso2) candidates.push(iso2);
    }
    while ((m = dmy.exec(text)) !== null) {
      const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      const iso2 = toIso(y, +m[2], +m[1]);
      if (iso2) candidates.push(iso2);
    }
  }
  if (candidates.length === 0) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    while ((m = monthName.exec(text)) !== null) {
      const month = months[m[2].toLowerCase().slice(0, 3)];
      const day = m[1] ? parseInt(m[1], 10) : m[3] ? parseInt(m[3], 10) : 1;
      const iso2 = toIso(+m[4], month, day || 1);
      if (iso2) candidates.push(iso2);
    }
  }

  return candidates[0] ?? null;
}

function toIso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const mm = String(mo).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Guess the vendor/place. Receipts almost always print the merchant name on the
 * first couple of non-empty lines, before addresses and totals.
 */
export function extractVendor(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^---\s*page\s*\d+\s*---$/i, "").trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/[^\p{L}\p{N}&'.\- ]/gu, "").trim();
    if (cleaned.length < 2 || cleaned.length > 60) continue;
    // Skip lines that are mostly digits (dates, totals, phone numbers).
    const digits = (cleaned.match(/\d/g) || []).length;
    if (digits / cleaned.length > 0.4) continue;
    // Skip obvious header noise.
    if (/^(receipt|invoice|order|tax\s*invoice|statement)$/i.test(cleaned)) continue;
    return cleaned;
  }
  return null;
}

/** Run all extractors over the OCR text. */
export function extractFields(text: string | null | undefined): Extracted {
  if (!text || !text.trim()) {
    return { amount: null, currency: null, vendor: null, doc_date: null };
  }
  const { amount, currency } = extractAmount(text);
  return {
    amount,
    currency,
    vendor: extractVendor(text),
    doc_date: extractDate(text),
  };
}
