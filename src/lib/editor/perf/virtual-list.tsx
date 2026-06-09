// Phase-4 — Lightweight virtualized list for 100+ section trees.
// Zero deps; uses fixed item height for predictable scrolling.

import { useEffect, useRef, useState, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 6,
  renderItem,
  getKey,
  className,
}: VirtualListProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollTop(el.scrollTop));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const total = items.length * itemHeight;
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscan,
  );

  const slice: ReactNode[] = [];
  for (let i = start; i < end; i++) {
    const item = items[i];
    slice.push(
      <div
        key={getKey ? getKey(item, i) : i}
        style={{
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        }}
      >
        {renderItem(item, i)}
      </div>,
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ height, overflowY: "auto", position: "relative" }}
    >
      <div style={{ height: total, position: "relative" }}>{slice}</div>
    </div>
  );
}
