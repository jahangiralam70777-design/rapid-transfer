# Phase-4 — Stability & Performance Layer

Additive hardening layer. Phase-1 (`SiteManagementFlow`), Phase-2 (Editor
Engine core), and Phase-3 (backend CMS + publish system) are untouched.

## Modules

### Performance (`src/lib/editor/perf/`)
- `scheduler.ts` — `debounce`, `throttle`, `chunkedRun` (idle-time batching).
- `virtual-list.tsx` — zero-dep virtualized list for 100+ section trees.
- `preview-sync.ts` — debounced diff-based iframe updates (no full reloads).
- `snapshot-compress.ts` — gzip via `CompressionStream`, raw fallback.
- `undo-cap.ts` — `MAX_UNDO=100`, `MAX_REDO=50`, `pushCapped` helper.
- `lazy-load.ts` — code-split history / diff / comments panels.

### Safety (`src/lib/editor/safety/`)
- `EditorErrorBoundary.tsx` — per-panel non-blocking boundary with retry.
- `auto-recovery.ts` — `retryWithBackoff`, `syncWithLocalFallback`.
- `secure-bridge.ts` — strict origin + command allow-list + 256KB cap + script sanitization.
- `publish-guard.ts` — version-mismatch / stale-draft / empty-page checks.
- `ConflictBanner.tsx` — soft, dismissible concurrent-edit banner.

## Opt-in usage

All modules are opt-in. Recommended wiring inside `SiteEditorV2Flow` /
`SiteManagementDesigner`:

```tsx
<EditorErrorBoundary area="Section Tree">
  <VirtualList items={sections} itemHeight={36} height={500} renderItem={...} />
</EditorErrorBoundary>

<EditorErrorBoundary area="Inspector">
  <InspectorPanel ... />
</EditorErrorBoundary>

const sync = useMemo(
  () => createPreviewSync({ target: iframeRef.current!.contentWindow!, origin }),
  [origin],
);
useEffect(() => sync.schedule(pageState), [pageState]);
```

Publish flow:

```ts
const guard = evaluatePublishGuard({ ... });
if (guard.severity === "block") return showBlockDialog(guard.reasons);
if (guard.requiresConfirmation) await confirm(guard.reasons);
await publishPage(...);
```

Sync layer:

```ts
const { degraded } = await syncWithLocalFallback({
  saveLocal: () => editorStorage.savePage(state),
  saveRemote: () => remoteSavePage(state),
});
if (degraded) setBannerDegraded(true);
```
