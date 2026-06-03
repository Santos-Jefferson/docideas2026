import path from "path";

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

const DATA_DIR = path.resolve(env("DATA_DIR", "./data"));

export const config = {
  dataDir: DATA_DIR,
  dbPath: path.join(DATA_DIR, "docinsights.db"),
  filesDir: path.join(DATA_DIR, "files"),
  docinsights: {
    baseUrl: env(
      "DOCINSIGHTS_BASE_URL",
      "https://docinsightsapi.use.eks.mcap.sip.dev.cloud.synchronoss.net"
    ).replace(/\/$/, ""),
    endpoint: env("DOCINSIGHTS_ENDPOINT", "/all"),
    timeoutMs: parseInt(env("DOCINSIGHTS_TIMEOUT_MS", "300000"), 10),
  },
  inboundEmailToken: process.env.INBOUND_EMAIL_TOKEN?.trim() || "",
  maxUploadBytes: parseInt(env("MAX_UPLOAD_MB", "25"), 10) * 1024 * 1024,
};
