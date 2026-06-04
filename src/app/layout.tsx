import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capsyl Docs",
  description: "Organize, search and gain insights from your documents and receipts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2f86f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold text-ink">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-extrabold text-white shadow-soft">
                  C
                </span>
                <span className="text-base sm:text-lg">Capsyl Docs</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-slate-100 hover:text-ink"
                >
                  Documents
                </Link>
                <Link
                  href="/email-setup"
                  className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-slate-100 hover:text-ink"
                >
                  Email setup
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 sm:pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
