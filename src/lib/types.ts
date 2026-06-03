export type DocStatus = "pending" | "processing" | "done" | "error";
export type DocSource = "upload" | "email";

export interface DocumentRow {
  id: number;
  public_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  ext: string;
  size: number;
  source: DocSource;
  sender_email: string | null;
  subject: string | null;
  status: DocStatus;
  error: string | null;
  ocr_text: string | null;
  summary: string | null;
  classification: string | null;
  amount: number | null;
  currency: string | null;
  vendor: string | null;
  doc_date: string | null; // ISO yyyy-mm-dd
  created_at: string;
  processed_at: string | null;
}

export interface ListFilters {
  q?: string;
  classification?: string;
  source?: DocSource;
  status?: DocStatus;
  minAmount?: number;
  maxAmount?: number;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc";
  limit?: number;
  offset?: number;
}

export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byClassification: { classification: string; count: number; total_amount: number }[];
  totalAmount: number;
}
