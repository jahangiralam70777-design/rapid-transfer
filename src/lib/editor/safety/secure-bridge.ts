// Phase-4 — Strict postMessage validation wrapper.
// Hardens the editor<->iframe bridge against:
//   - cross-origin spoofing
//   - unknown command types
//   - oversized payloads
//   - script-injection attempts via untrusted strings

import {
  attachBridgeListener,
  isBridgeMessage,
} from "@/lib/editor/bridge";
import type { BridgeCommand } from "@/lib/editor/types";

const KNOWN_COMMANDS = new Set<string>([
  "SELECT_ELEMENT",
  "UPDATE_TEXT",
  "UPDATE_STYLES",
  "REORDER_SECTIONS",
  "TOGGLE_VISIBILITY",
  "PATCH_SECTIONS",
  "RELOAD_PREVIEW",
  "READY",
  "HOVER",
  "CLICK",
]);

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256KB hard cap per message

export interface SecureBridgeOptions {
  allowedOrigin: string;
  onCommand: (command: BridgeCommand) => void;
  onReject?: (reason: string, event?: MessageEvent) => void;
}

function approxSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Infinity;
  }
}

function looksLikeScript(s: string): boolean {
  // Strip obvious script-injection shapes from user-controlled strings.
  return /<\s*script|javascript:|on\w+\s*=/i.test(s);
}

function sanitizeDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return looksLikeScript(value) ? value.replace(/[<>]/g, "") : value;
  }
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v);
    }
    return out;
  }
  return value;
}

export function attachSecureBridge({
  allowedOrigin,
  onCommand,
  onReject,
}: SecureBridgeOptions): () => void {
  if (!allowedOrigin || allowedOrigin === "*") {
    throw new Error("attachSecureBridge: allowedOrigin must be a concrete origin");
  }

  // Wrap raw listener to add extra validation passes.
  const handler = (event: MessageEvent) => {
    if (event.origin !== allowedOrigin) {
      onReject?.("bad_origin", event);
      return;
    }
    if (!isBridgeMessage(event.data)) {
      onReject?.("bad_envelope", event);
      return;
    }
    const cmd = event.data.command;
    if (!KNOWN_COMMANDS.has(cmd.type)) {
      onReject?.("unknown_command", event);
      return;
    }
    if (approxSize(cmd) > MAX_PAYLOAD_BYTES) {
      onReject?.("payload_too_large", event);
      return;
    }
    const safe = sanitizeDeep(cmd) as BridgeCommand;
    onCommand(safe);
  };

  window.addEventListener("message", handler);
  // attachBridgeListener handles the same origin/envelope gates — keep both
  // wired so consumers using the raw helper stay compatible.
  const off = attachBridgeListener({
    allowedOrigin,
    onCommand: () => {
      /* handled by the secure handler above */
    },
  });

  return () => {
    window.removeEventListener("message", handler);
    off();
  };
}
