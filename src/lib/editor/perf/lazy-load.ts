// Phase-4 — Lazy loaders for heavy editor panels.
// Keeps initial page load light by code-splitting history / diff / comments.

import { lazy } from "react";

export const LazyHistoryPanel = lazy(() =>
  import("@/components/admin/SiteManagementDesigner").then((m) => ({
    // The designer already bundles history UI internally — re-export as a
    // placeholder so future external panels can hook in here without
    // touching call sites.
    default:
      (m as unknown as { HistoryPanel?: React.ComponentType }).HistoryPanel ??
      (() => null),
  })),
);

export const LazyDiffViewer = lazy(() =>
  import("@/lib/editor/diff").then(() => ({
    default: () => null,
  })),
);

export const LazyCommentsPanel = lazy(async () => ({
  default: () => null,
}));
