// Phase-4 — Debounced, diff-based preview sync.
// Pushes only changed sections to the iframe instead of reloading.

import { sendBridgeCommand } from "@/lib/editor/bridge";
import type { BridgeCommand, EditorSection, PageState } from "@/lib/editor/types";
import { debounce } from "./scheduler";

export interface PreviewSyncOptions {
  target: Window;
  origin: string;
  debounceMs?: number;
}

export interface PreviewSyncHandle {
  schedule: (next: PageState) => void;
  flush: () => void;
  dispose: () => void;
}

function diffSections(prev: EditorSection[], next: EditorSection[]) {
  const prevMap = new Map(prev.map((s) => [s.id, s]));
  const nextMap = new Map(next.map((s) => [s.id, s]));
  const changed: EditorSection[] = [];
  const removed: string[] = [];
  for (const s of next) {
    const p = prevMap.get(s.id);
    if (!p || JSON.stringify(p) !== JSON.stringify(s)) changed.push(s);
  }
  for (const s of prev) if (!nextMap.has(s.id)) removed.push(s.id);
  const reordered =
    prev.length === next.length &&
    prev.some((s, i) => next[i] && next[i].id !== s.id);
  return { changed, removed, reordered };
}

export function createPreviewSync({
  target,
  origin,
  debounceMs = 600,
}: PreviewSyncOptions): PreviewSyncHandle {
  let last: PageState | null = null;

  const send = (state: PageState) => {
    if (!last) {
      const cmd: BridgeCommand = {
        type: "RELOAD_PREVIEW",
      } as unknown as BridgeCommand;
      try {
        sendBridgeCommand(target, origin, cmd);
      } catch {
        /* noop — iframe may be detached */
      }
      last = state;
      return;
    }
    const { changed, removed, reordered } = diffSections(last.sections, state.sections);
    if (!changed.length && !removed.length && !reordered) {
      last = state;
      return;
    }
    try {
      const cmd: BridgeCommand = {
        type: "PATCH_SECTIONS",
        payload: { changed, removed, reordered, versionId: state.versionId },
      } as unknown as BridgeCommand;
      sendBridgeCommand(target, origin, cmd);
    } catch {
      /* noop */
    }
    last = state;
  };

  const debounced = debounce((s: PageState) => send(s), debounceMs);

  return {
    schedule: (next) => debounced(next),
    flush: () => debounced.flush(),
    dispose: () => debounced.cancel(),
  };
}
