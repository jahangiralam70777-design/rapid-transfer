// Phase-4 — Snapshot compression.
// Lightweight JSON compression for old snapshots to cap memory footprint.
// Uses CompressionStream when available, falls back to base64 JSON.

const HAS_CS =
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined";

export interface CompressedSnapshot {
  __compressed: true;
  algo: "gzip" | "raw";
  data: string; // base64
  size: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function compressSnapshot(value: unknown): Promise<CompressedSnapshot> {
  const json = JSON.stringify(value);
  if (!HAS_CS) {
    const bytes = new TextEncoder().encode(json);
    return { __compressed: true, algo: "raw", data: bytesToBase64(bytes), size: bytes.length };
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  return { __compressed: true, algo: "gzip", data: bytesToBase64(buf), size: buf.length };
}

export async function decompressSnapshot<T = unknown>(c: CompressedSnapshot): Promise<T> {
  const bytes = base64ToBytes(c.data);
  if (c.algo === "raw" || !HAS_CS) {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const json = await new Response(stream).text();
  return JSON.parse(json) as T;
}

export function isCompressed(v: unknown): v is CompressedSnapshot {
  return !!v && typeof v === "object" && (v as { __compressed?: unknown }).__compressed === true;
}

// Cap a history array: keep `keepFull` newest entries uncompressed, compress the rest.
export async function capHistory<T extends { state?: unknown }>(
  history: T[],
  keepFull: number,
  maxTotal: number,
): Promise<T[]> {
  const trimmed = history.slice(-maxTotal);
  const splitAt = Math.max(0, trimmed.length - keepFull);
  const out: T[] = new Array(trimmed.length);
  for (let i = 0; i < trimmed.length; i++) {
    if (i < splitAt && trimmed[i].state && !isCompressed(trimmed[i].state)) {
      out[i] = { ...trimmed[i], state: await compressSnapshot(trimmed[i].state) } as T;
    } else {
      out[i] = trimmed[i];
    }
  }
  return out;
}
