import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your documents</h1>
        <p className="mt-0.5 text-sm text-muted">
          Snap, upload or email a receipt. Search by amount, place or anything in the text.
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
