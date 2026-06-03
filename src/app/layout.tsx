import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocInsights Organizer",
  description: "Organize, search and gain insights from your documents and receipts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-sm text-white">
                  Di
                </span>
                DocInsights Organizer
              </Link>
              <nav className="text-sm text-slate-500">
                <span>MVP</span>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
