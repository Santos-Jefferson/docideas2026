export function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${currency ? currency + " " : ""}${amount.toFixed(2)}`;
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function classificationColor(label: string | null): string {
  const key = (label || "unclassified").toLowerCase();
  const palette: Record<string, string> = {
    invoice: "bg-blue-100 text-blue-700",
    receipt: "bg-green-100 text-green-700",
    contract: "bg-purple-100 text-purple-700",
    statement: "bg-amber-100 text-amber-700",
    letter: "bg-pink-100 text-pink-700",
    report: "bg-indigo-100 text-indigo-700",
    unclassified: "bg-slate-100 text-slate-500",
  };
  return palette[key] ?? "bg-slate-100 text-slate-700";
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-600",
    processing: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}
