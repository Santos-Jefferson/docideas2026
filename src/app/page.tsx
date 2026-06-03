import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Your documents</h1>
        <p className="text-sm text-slate-500">
          Upload or email receipts and documents. Search by amount, vendor, category or anything in the text.
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
