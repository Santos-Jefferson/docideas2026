import { headers } from "next/headers";
import Link from "next/link";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function EmailSetupPage() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "your-app-host";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const tokenSet = Boolean(config.inboundEmailToken);
  const webhook = `${origin}/api/email/inbound?token=YOUR_TOKEN`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Forward documents by email</h1>
        <p className="mt-1 text-sm text-muted">
          The app receives emails through an <strong>inbound email service</strong> that turns each
          message (and its attachments) into a webhook call. Set it up once, then just forward receipts.
        </p>
      </div>

      <Card title="Your webhook URL">
        <p className="text-sm text-muted">
          Point your inbound email service at this endpoint. Replace <code className="rounded bg-slate-100 px-1">YOUR_TOKEN</code> with
          the value of <code className="rounded bg-slate-100 px-1">INBOUND_EMAIL_TOKEN</code> from your <code className="rounded bg-slate-100 px-1">.env</code>.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-slate-100">{webhook}</pre>
        <p className="mt-2 text-xs">
          {tokenSet ? (
            <span className="text-emerald-600">✓ A token is configured on this server.</span>
          ) : (
            <span className="text-amber-600">
              ⚠ No token set — add <code className="rounded bg-slate-100 px-1">INBOUND_EMAIL_TOKEN</code> to your <code className="rounded bg-slate-100 px-1">.env</code> so
              strangers can&apos;t POST documents into your app.
            </span>
          )}
        </p>
        <p className="mt-2 text-xs text-muted">
          Note: the email service POSTs from the public internet, so the app must be reachable from outside.
          When running locally, expose it with a tunnel (e.g. <code className="rounded bg-slate-100 px-1">cloudflared tunnel</code> or
          <code className="rounded bg-slate-100 px-1"> ngrok http 3000</code>) and use that public URL above.
        </p>
      </Card>

      <Card title="Step 1 — Pick an inbound email service">
        <p className="text-sm text-muted">Any of these forward incoming mail to a webhook. Pick one:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          <li>• <strong>CloudMailin</strong> — quickest for personal use; gives you an address out of the box.</li>
          <li>• <strong>SendGrid Inbound Parse</strong> — free tier, needs a domain MX record.</li>
          <li>• <strong>Mailgun Routes</strong> — similar, domain-based.</li>
          <li>• <strong>Postmark inbound</strong> — gives you an <code className="rounded bg-slate-100 px-1">@inbound.postmarkapp.com</code> address.</li>
        </ul>
      </Card>

      <Card title="Step 2 — Route incoming mail to the webhook">
        <p className="text-sm text-muted">
          In the service&apos;s dashboard, create an inbound route/parse rule whose action is
          “POST to URL”, and paste your webhook URL from above. The service will give you an
          email address (e.g. <code className="rounded bg-slate-100 px-1">docs@in.yourdomain.com</code>).
        </p>
        <p className="mt-2 text-sm text-muted">
          The app already understands the standard <strong>multipart/form-data</strong> payloads from
          SendGrid and Mailgun — attachments come through automatically, and the sender / subject are recorded.
        </p>
      </Card>

      <Card title="Step 3 — Forward your receipts">
        <p className="text-sm text-muted">Two easy ways to get mail to that address:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          <li>
            • <strong>Manually:</strong> in Gmail/Outlook, open a receipt and hit <em>Forward</em> to the address.
            The attachment rides along and shows up here within seconds.
          </li>
          <li>
            • <strong>Automatically:</strong> create a Gmail filter (e.g. <em>has attachment</em> +
            from common stores) → “Forward to” that address. New receipts land in the app on their own.
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          Supported attachments: PDF, PNG, JPG, GIF, WEBP, TIFF, BMP. Other types are skipped.
        </p>
      </Card>

      <Card title="Prefer to test without a mail provider?">
        <p className="text-sm text-muted">You can POST a base64 attachment directly:</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 text-[11px] leading-relaxed text-slate-100">{`curl -X POST "${origin}/api/email/inbound?token=YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "you@example.com",
    "subject": "Lunch receipt",
    "attachments": [
      { "filename": "receipt.pdf", "base64": "JVBERi0xLjQK..." }
    ]
  }'`}</pre>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card sm:p-5">
      <h2 className="mb-2 text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
