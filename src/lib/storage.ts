import fs from "fs";
import path from "path";
import crypto from "crypto";
import { config } from "./config";

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
};

export function extOf(filename: string): string {
  return path.extname(filename || "").toLowerCase();
}

export function mimeFor(filename: string, fallback?: string): string {
  return EXT_MIME[extOf(filename)] ?? fallback ?? "application/octet-stream";
}

export function isSupported(filename: string): boolean {
  return extOf(filename) in EXT_MIME;
}

/** Persist a file buffer to the files directory under a random stored name. */
export function saveFile(originalName: string, buffer: Buffer): { storedName: string; size: number } {
  fs.mkdirSync(config.filesDir, { recursive: true });
  const ext = extOf(originalName) || ".bin";
  const storedName = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(config.filesDir, storedName), buffer);
  return { storedName, size: buffer.length };
}

export function fileBuffer(storedName: string): Buffer {
  return fs.readFileSync(path.join(config.filesDir, storedName));
}

export function deleteFile(storedName: string): void {
  try {
    fs.unlinkSync(path.join(config.filesDir, storedName));
  } catch {
    /* already gone */
  }
}
