import DocumentDetail from "@/components/DocumentDetail";

export const dynamic = "force-dynamic";

export default function DocumentPage({ params }: { params: { id: string } }) {
  return <DocumentDetail id={params.id} />;
}
