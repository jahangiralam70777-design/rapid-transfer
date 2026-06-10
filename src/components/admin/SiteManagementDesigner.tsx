// Site Management — Designer surface (UI redesign).
// Pure presentation layer: a Webflow/Framer-style 3-panel editor that wraps
// the real homepage in a live preview iframe. Backend logic, server functions,
// and Phase-1 SiteManagementFlow are untouched — this is a swap at the route
// level only.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  GitCompare,
  History,
  Image as ImageIcon,
  Layers,
  Lock,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Redo2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------------
// Local UI model — opinionated for presentation only. Real persistence
// lives in Phase-1/Phase-2 layers; this surface does not write to them.
// -------------------------------------------------------------------

type PageStatus = "draft" | "published";
interface PageEntry {
  id: string;
  name: string;
  path: string;
  status: PageStatus;
  version: number;
  updatedAt: string;
}

interface SectionNode {
  id: string;
  type: string;
  name: string;
  icon: typeof Layers;
  visible: boolean;
  locked?: boolean;
  children?: SectionNode[];
}

const INITIAL_PAGES: PageEntry[] = [
  { id: "home", name: "Home", path: "/", status: "published", version: 27, updatedAt: "2m ago" },
  {
    id: "about",
    name: "About Us",
    path: "/about",
    status: "draft",
    version: 12,
    updatedAt: "1h ago",
  },
  {
    id: "courses",
    name: "Courses",
    path: "/courses",
    status: "published",
    version: 19,
    updatedAt: "yesterday",
  },
  {
    id: "features",
    name: "Features",
    path: "/features",
    status: "draft",
    version: 4,
    updatedAt: "3d ago",
  },
  {
    id: "blogs",
    name: "Blogs",
    path: "/blogs",
    status: "published",
    version: 31,
    updatedAt: "1w ago",
  },
  {
    id: "contact",
    name: "Contact",
    path: "/contact",
    status: "published",
    version: 8,
    updatedAt: "2w ago",
  },
  { id: "faq", name: "FAQ", path: "/faq", status: "draft", version: 2, updatedAt: "1mo ago" },
];

const INITIAL_SECTIONS: SectionNode[] = [
  {
    id: "hero",
    type: "hero",
    name: "Hero Section",
    icon: Sparkles,
    visible: true,
    children: [
      { id: "hero-title", type: "text", name: "Headline", icon: Type, visible: true },
      { id: "hero-cta", type: "button", name: "Primary CTA", icon: Square, visible: true },
    ],
  },
  {
    id: "features",
    type: "features",
    name: "Features Grid",
    icon: Layers,
    visible: true,
    children: [
      { id: "feat-card-1", type: "card", name: "Feature Card 1", icon: Square, visible: true },
      { id: "feat-card-2", type: "card", name: "Feature Card 2", icon: Square, visible: true },
      { id: "feat-card-3", type: "card", name: "Feature Card 3", icon: Square, visible: false },
    ],
  },
  { id: "content", type: "content", name: "Content Block", icon: FileText, visible: true },
  {
    id: "testimonials",
    type: "testimonials",
    name: "Testimonials",
    icon: Users,
    visible: true,
    locked: true,
  },
  { id: "cta", type: "cta", name: "Call to Action", icon: Sparkles, visible: true },
  { id: "footer", type: "footer", name: "Footer", icon: Layers, visible: true, locked: true },
];

const VERSIONS = [
  { id: "v27", number: 27, label: "Hero copy tweak", author: "You", time: "2m ago", current: true },
  { id: "v26", number: 26, label: "Footer link cleanup", author: "Aarav", time: "1h ago" },
  { id: "v25", number: 25, label: "New testimonial added", author: "Priya", time: "yesterday" },
  { id: "v24", number: 24, label: "Initial publish", author: "You", time: "2d ago" },
];

const DIFF_ROWS = [
  { kind: "added", label: "Hero / Subtitle line 2" },
  { kind: "modified", label: "Hero / Headline (12 chars)" },
  { kind: "removed", label: "Features / Card 3 (hidden)" },
  { kind: "modified", label: "CTA / Button color" },
] as const;

const ACTIVITY = [
  { who: "You", what: "edited the Hero headline", when: "just now" },
  { who: "Aarav", what: "duplicated Features Grid", when: "12m ago" },
  { who: "Priya", what: "published Version 26", when: "1h ago" },
  { who: "You", what: "restored Version 24", when: "yesterday" },
];

const COMMENTS = [
  {
    section: "Hero Section",
    author: "Priya",
    body: "Can we shorten the headline to one line on mobile?",
    when: "30m ago",
  },
  {
    section: "Features Grid",
    author: "Aarav",
    body: "Card 3 still feels off — hidden for now.",
    when: "1h ago",
  },
];

// -------------------------------------------------------------------

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1280, tablet: 834, mobile: 390 };

export default function SiteManagementDesigner() {
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [activePageId, setActivePageId] = useState("home");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>("hero");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ hero: true, features: true });
  const [pageSearch, setPageSearch] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [iframeKey, setIframeKey] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStep, setPublishStep] = useState<"draft" | "review" | "publish">("draft");
  const [bottomTab, setBottomTab] = useState("history");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const previewSrc = useMemo(() => {
    const path = activePage?.path ?? "/";
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}site-preview=1`;
  }, [activePage?.path]);
  const filteredPages = useMemo(
    () => pages.filter((p) => p.name.toLowerCase().includes(pageSearch.toLowerCase())),
    [pages, pageSearch],
  );

  const selectedSection = useMemo(
    () => findSection(sections, selectedSectionId),
    [sections, selectedSectionId],
  );

  // Inject the chosen theme into the preview iframe each time it loads or toggles.
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.documentElement.classList.toggle("dark", previewTheme === "dark");
  }, [previewTheme, iframeKey]);

  function toggleSectionVisibility(id: string) {
    setSections((prev) => mapSections(prev, id, (s) => ({ ...s, visible: !s.visible })));
  }
  function moveSection(id: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function duplicateSection(id: string) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const orig = prev[idx];
      const clone: SectionNode = {
        ...orig,
        id: `${orig.id}-copy-${Date.now()}`,
        name: `${orig.name} (Copy)`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }
  function deleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedSectionId === id) setSelectedSectionId(null);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 text-foreground shadow-card-soft">
        <TopBar
          pageName={activePage?.name ?? "Home"}
          version={activePage?.version ?? 1}
          status={activePage?.status ?? "draft"}
          onPublish={() => {
            setPublishStep("draft");
            setPublishOpen(true);
          }}
        />

        <div className="flex flex-1 min-h-0">
          {/* LEFT: Pages */}
          <aside className="w-56 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur-md flex flex-col 2xl:w-72">
            <div className="p-4 border-b border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight">Pages</h2>
                <Button size="sm" variant="ghost" className="h-7 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Search pages"
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <ul className="p-2 space-y-1">
                {filteredPages.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setActivePageId(p.id)}
                      className={cn(
                        "group w-full text-left rounded-md px-3 py-2 text-sm transition-colors border border-transparent",
                        activePageId === p.id
                          ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                          : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        <StatusDot status={p.status} />
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate">{p.path}</span>
                        <span>v{p.version}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <div className="p-3 border-t border-border/60">
              <Button size="sm" variant="outline" className="w-full justify-center gap-2">
                <Plus className="h-4 w-4" /> Add Page
              </Button>
            </div>
          </aside>

          {/* MIDDLE: Structure tree */}
          <aside className="w-56 shrink-0 border-r border-border/60 bg-card/30 backdrop-blur-md flex flex-col 2xl:w-72">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Structure</h2>
                <p className="text-[11px] text-muted-foreground">{sections.length} sections</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <ul className="p-2 space-y-0.5">
                {sections.map((s) => (
                  <SectionRow
                    key={s.id}
                    section={s}
                    depth={0}
                    selected={selectedSectionId === s.id}
                    expanded={!!expanded[s.id]}
                    onToggleExpanded={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}
                    onSelect={() => setSelectedSectionId(s.id)}
                    onToggleVisibility={() => toggleSectionVisibility(s.id)}
                    onDuplicate={() => duplicateSection(s.id)}
                    onDelete={() => deleteSection(s.id)}
                  />
                ))}
              </ul>
            </ScrollArea>
          </aside>

          {/* CENTER: Preview + bottom panels */}
          <main className="flex-1 min-w-0 flex flex-col bg-muted/20">
            <PreviewToolbar
              device={device}
              setDevice={setDevice}
              previewTheme={previewTheme}
              setPreviewTheme={setPreviewTheme}
              onRefresh={() => setIframeKey((k) => k + 1)}
              path={activePage?.path ?? "/"}
            />
            <div className="flex-1 min-h-0 overflow-auto p-4 2xl:p-6">
              <div className="mx-auto flex w-full justify-center">
                <PreviewFrame key={iframeKey} ref={iframeRef} device={device} src={previewSrc} />
              </div>
              {selectedSection ? (
                <FloatingToolbar
                  sectionName={selectedSection.name}
                  visible={selectedSection.visible}
                  onUp={() => moveSection(selectedSection.id, -1)}
                  onDown={() => moveSection(selectedSection.id, 1)}
                  onToggle={() => toggleSectionVisibility(selectedSection.id)}
                  onDuplicate={() => duplicateSection(selectedSection.id)}
                  onDelete={() => deleteSection(selectedSection.id)}
                  livePath={activePage?.path ?? "/"}
                />
              ) : null}
            </div>

            {/* Bottom docked panels */}
            <div className="border-t border-border/60 bg-card/40 backdrop-blur-md">
              <Tabs value={bottomTab} onValueChange={setBottomTab}>
                <div className="flex items-center justify-between px-4 pt-2">
                  <TabsList className="bg-muted/40">
                    <TabsTrigger value="history" className="gap-1.5 text-xs">
                      <History className="h-3.5 w-3.5" /> History
                    </TabsTrigger>
                    <TabsTrigger value="diff" className="gap-1.5 text-xs">
                      <GitCompare className="h-3.5 w-3.5" /> Diff
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5" /> Activity
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="gap-1.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" /> Comments
                    </TabsTrigger>
                  </TabsList>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Draft → Review → Publish
                  </span>
                </div>
                <div className="h-44 overflow-hidden">
                  <TabsContent value="history" className="m-0 h-full">
                    <HistoryPanel />
                  </TabsContent>
                  <TabsContent value="diff" className="m-0 h-full">
                    <DiffPanel />
                  </TabsContent>
                  <TabsContent value="activity" className="m-0 h-full">
                    <ActivityPanel />
                  </TabsContent>
                  <TabsContent value="comments" className="m-0 h-full">
                    <CommentsPanel />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </main>

          {/* RIGHT: Inspector */}
          <aside className="w-72 shrink-0 border-l border-border/60 bg-card/40 backdrop-blur-md flex flex-col 2xl:w-80">
            <Inspector section={selectedSection} />
          </aside>
        </div>

        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          step={publishStep}
          setStep={setPublishStep}
          version={activePage?.version ?? 1}
        />
      </div>
    </TooltipProvider>
  );
}

// =========================== sub-components ===========================

function TopBar({
  pageName,
  version,
  status,
  onPublish,
}: {
  pageName: string;
  version: number;
  status: PageStatus;
  onPublish: () => void;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-border/60 bg-card/60 backdrop-blur-xl flex items-center px-4 gap-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground shadow-sm">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">Site Designer</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {pageName} · Version {version}
          </p>
        </div>
      </div>
      <div className="mx-2 h-6 w-px bg-border" />
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-3 w-3" /> Safe publish pipeline
        </Badge>
        <div className="flex -space-x-1.5">
          {["A", "P", "Y"].map((c, i) => (
            <div
              key={c}
              className={cn(
                "h-7 w-7 rounded-full ring-2 ring-card grid place-items-center text-[11px] font-semibold text-primary-foreground",
                i === 0 && "bg-indigo-500",
                i === 1 && "bg-rose-500",
                i === 2 && "bg-amber-500",
              )}
            >
              {c}
            </div>
          ))}
        </div>
        <StatusBadge status={status} />
        <Button size="sm" variant="outline" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Preview
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-br from-primary to-primary/80"
          onClick={onPublish}
        >
          <Rocket className="h-3.5 w-3.5" /> Publish
        </Button>
      </div>
    </header>
  );
}

function StatusDot({ status }: { status: PageStatus }) {
  return (
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        status === "published"
          ? "bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.500)]"
          : "bg-amber-500",
      )}
    />
  );
}

function StatusBadge({ status }: { status: PageStatus }) {
  return status === "published" ? (
    <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/30">
      Published
    </Badge>
  ) : (
    <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 border-amber-500/30">
      Draft
    </Badge>
  );
}

function SectionRow({
  section,
  depth,
  selected,
  expanded,
  onToggleExpanded,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: {
  section: SectionNode;
  depth: number;
  selected: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const Icon = section.icon;
  const hasChildren = section.children && section.children.length > 0;
  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs transition-colors border border-transparent",
          selected ? "bg-primary/10 border-primary/30" : "hover:bg-muted/60",
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <span className="flex h-5 w-5 items-center justify-center text-muted-foreground cursor-grab">
          <MoreHorizontal className="h-3 w-3 rotate-90" />
        </span>
        {hasChildren ? (
          <button
            onClick={onToggleExpanded}
            className="h-5 w-5 grid place-items-center text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button onClick={onSelect} className="flex-1 min-w-0 flex items-center gap-1.5 text-left">
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              section.visible ? "text-primary" : "text-muted-foreground/60",
            )}
          />
          <span
            className={cn(
              "truncate font-medium",
              !section.visible && "text-muted-foreground line-through",
            )}
          >
            {section.name}
          </span>
          {section.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
        </button>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <IconBtn onClick={onToggleVisibility} title={section.visible ? "Hide" : "Show"}>
            {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </IconBtn>
          <IconBtn onClick={onDuplicate} title="Duplicate">
            <Copy className="h-3 w-3" />
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete">
            <Trash2 className="h-3 w-3" />
          </IconBtn>
        </div>
      </div>
      {hasChildren && expanded ? (
        <ul className="space-y-0.5 mt-0.5">
          {section.children!.map((c) => (
            <SectionRow
              key={c.id}
              section={c}
              depth={depth + 1}
              selected={false}
              expanded={false}
              onToggleExpanded={() => {}}
              onSelect={onSelect}
              onToggleVisibility={() => {}}
              onDuplicate={() => {}}
              onDelete={() => {}}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="h-6 w-6 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function PreviewToolbar({
  device,
  setDevice,
  previewTheme,
  setPreviewTheme,
  onRefresh,
  path,
}: {
  device: Device;
  setDevice: (d: Device) => void;
  previewTheme: "light" | "dark";
  setPreviewTheme: (t: "light" | "dark") => void;
  onRefresh: () => void;
  path: string;
}) {
  return (
    <div className="h-12 shrink-0 border-b border-border/60 bg-card/50 backdrop-blur flex items-center px-4 gap-3">
      <div className="flex items-center rounded-md border border-border/60 bg-background/60 p-0.5">
        <DeviceBtn
          active={device === "desktop"}
          onClick={() => setDevice("desktop")}
          title="Desktop"
        >
          <Monitor className="h-3.5 w-3.5" />
        </DeviceBtn>
        <DeviceBtn active={device === "tablet"} onClick={() => setDevice("tablet")} title="Tablet">
          <Tablet className="h-3.5 w-3.5" />
        </DeviceBtn>
        <DeviceBtn active={device === "mobile"} onClick={() => setDevice("mobile")} title="Mobile">
          <Smartphone className="h-3.5 w-3.5" />
        </DeviceBtn>
      </div>
      <div className="text-xs text-muted-foreground font-mono px-2 py-1 rounded border border-border/60 bg-background/60">
        {path}
      </div>
      <span className="text-[10px] text-muted-foreground ml-1">
        {DEVICE_WIDTHS[device]}px live preview
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <div className="flex items-center rounded-md border border-border/60 bg-background/60 p-0.5">
          <DeviceBtn
            active={previewTheme === "light"}
            onClick={() => setPreviewTheme("light")}
            title="Light"
          >
            <Sun className="h-3.5 w-3.5" />
          </DeviceBtn>
          <DeviceBtn
            active={previewTheme === "dark"}
            onClick={() => setPreviewTheme("dark")}
            title="Dark"
          >
            <Moon className="h-3.5 w-3.5" />
          </DeviceBtn>
        </div>
      </div>
    </div>
  );
}

function DeviceBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "h-7 w-7 rounded grid place-items-center transition-colors",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

const PreviewFrame = (() => {
  const Comp = (
    { device, src }: { device: Device; src: string },
    ref: React.Ref<HTMLIFrameElement>,
  ) => {
    const w = DEVICE_WIDTHS[device];
    return (
      <div
        className="relative rounded-xl border border-border/60 bg-background shadow-2xl shadow-primary/5 ring-1 ring-border/40 overflow-hidden transition-all"
        style={{
          width: "100%",
          maxWidth: w,
          height: device === "desktop" ? 760 : device === "tablet" ? 1024 : 720,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-muted/80 to-muted/40 border-b border-border/60 flex items-center px-2 gap-1.5 z-10">
          <span className="h-2 w-2 rounded-full bg-rose-400/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-[10px] text-muted-foreground font-mono truncate">
            {src.replace(/[?&]site-preview=1$/, "")}
          </span>
        </div>
        <iframe
          ref={ref}
          src={src}
          title="Live site preview"
          className="absolute inset-0 mt-6 h-[calc(100%-1.5rem)] w-full bg-background"
        />
      </div>
    );
  };
  return Object.assign(
    (props: { device: Device; src: string } & { ref?: React.Ref<HTMLIFrameElement> }) =>
      // forwardRef-light: spreads ref through
      Comp(props, (props as any).ref),
    { displayName: "PreviewFrame" },
  );
})() as unknown as React.ForwardRefExoticComponent<
  { device: Device; src: string } & React.RefAttributes<HTMLIFrameElement>
>;

function FloatingToolbar({
  sectionName,
  visible,
  onUp,
  onDown,
  onToggle,
  onDuplicate,
  onDelete,
  livePath,
}: {
  sectionName: string;
  visible: boolean;
  onUp: () => void;
  onDown: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  livePath: string;
}) {
  return (
    <div className="sticky bottom-4 mx-auto mt-4 w-fit">
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/95 backdrop-blur-xl px-2 py-1.5 shadow-2xl shadow-primary/10">
        <div className="px-2 text-xs font-medium">{sectionName}</div>
        <Separator orientation="vertical" className="h-5" />
        <FloatBtn onClick={() => {}} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </FloatBtn>
        <FloatBtn onClick={onUp} title="Move up">
          <ArrowUp className="h-3.5 w-3.5" />
        </FloatBtn>
        <FloatBtn onClick={onDown} title="Move down">
          <ArrowDown className="h-3.5 w-3.5" />
        </FloatBtn>
        <FloatBtn onClick={onToggle} title={visible ? "Hide" : "Show"}>
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </FloatBtn>
        <FloatBtn onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </FloatBtn>
        <FloatBtn onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        </FloatBtn>
        <Separator orientation="vertical" className="h-5" />
        <a
          href={livePath}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View live
        </a>
      </div>
    </div>
  );
}

function FloatBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function Inspector({ section }: { section: SectionNode | null }) {
  if (!section) {
    return (
      <div className="flex-1 grid place-items-center p-6 text-center">
        <div className="space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 grid place-items-center mx-auto">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nothing selected</p>
          <p className="text-xs text-muted-foreground">Pick a section to edit its properties.</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Inspector</h2>
          <Badge variant="outline" className="text-[10px] capitalize">
            {section.type}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{section.name}</p>
      </div>
      <Tabs defaultValue="design" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-3 grid grid-cols-3 bg-muted/40">
          <TabsTrigger value="design" className="text-xs">
            Design
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            Layout
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            Advanced
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 mt-3">
          <TabsContent value="design" className="m-0 px-4 pb-6 space-y-5">
            <Field label="Section title">
              <Input defaultValue={section.name} className="h-8 text-xs" />
            </Field>
            <Field label="Background">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue="#0f172a"
                  className="h-8 w-10 rounded border border-border/60 bg-transparent"
                />
                <Select defaultValue="solid">
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Field>
            <Field label="Background image">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
                <ImageIcon className="h-3.5 w-3.5" /> Choose from library
              </Button>
            </Field>
            <Field label="Animation">
              <Select defaultValue="fade-up">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="fade-up">Fade up</SelectItem>
                  <SelectItem value="fade-in">Fade in</SelectItem>
                  <SelectItem value="slide-in">Slide in</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </TabsContent>
          <TabsContent value="layout" className="m-0 px-4 pb-6 space-y-5">
            <Field label="Padding (Y)">
              <Slider defaultValue={[64]} max={200} step={4} />
            </Field>
            <Field label="Padding (X)">
              <Slider defaultValue={[24]} max={120} step={4} />
            </Field>
            <Field label="Margin top">
              <Slider defaultValue={[0]} max={200} step={4} />
            </Field>
            <Field label="Max width">
              <Select defaultValue="xl">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                  <SelectItem value="full">Full width</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Device visibility">
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <ToggleChip label="Desktop" defaultOn />
                <ToggleChip label="Tablet" defaultOn />
                <ToggleChip label="Mobile" defaultOn />
              </div>
            </Field>
          </TabsContent>
          <TabsContent value="advanced" className="m-0 px-4 pb-6 space-y-5">
            <Field label="Visible">
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <span className="text-xs text-muted-foreground">Show on live site</span>
                <Switch defaultChecked={section.visible} />
              </div>
            </Field>
            <Field label="Custom CSS">
              <Textarea
                rows={5}
                placeholder=".section { /* your css here */ }"
                className="font-mono text-[11px]"
              />
            </Field>
            <Field label="Anchor ID">
              <Input placeholder={`#${section.id}`} className="h-8 text-xs font-mono" />
            </Field>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleChip({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "rounded-md border px-2 py-1.5 transition-colors",
        on
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function HistoryPanel() {
  return (
    <ScrollArea className="h-full">
      <ul className="divide-y divide-border/50">
        {VERSIONS.map((v) => (
          <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
            <div
              className={cn(
                "h-7 w-7 rounded-full grid place-items-center text-[10px] font-semibold",
                v.current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              v{v.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{v.label}</div>
              <div className="text-[10px] text-muted-foreground">
                {v.author} · {v.time}
              </div>
            </div>
            {v.current ? (
              <Badge variant="outline" className="text-[10px]">
                Current
              </Badge>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 text-[11px]">
                Restore
              </Button>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function DiffPanel() {
  return (
    <div className="grid h-full grid-cols-2 divide-x divide-border/50">
      <ScrollArea className="h-full">
        <div className="p-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Version 26
        </div>
        <pre className="px-3 pb-3 text-[11px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {`hero.title  "Build faster."
hero.cta    "Start free"
features[3] visible: true
cta.color   #4F46E5`}
        </pre>
      </ScrollArea>
      <ScrollArea className="h-full">
        <div className="p-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Version 27 (current)
        </div>
        <ul className="px-3 pb-3 space-y-1.5 text-[11px] font-mono">
          {DIFF_ROWS.map((r) => (
            <li
              key={r.label}
              className={cn(
                "rounded px-2 py-1.5 border",
                r.kind === "added" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                r.kind === "removed" &&
                  "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 line-through",
                r.kind === "modified" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
            >
              [{r.kind}] {r.label}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

function ActivityPanel() {
  return (
    <ScrollArea className="h-full">
      <ul className="divide-y divide-border/50">
        {ACTIVITY.map((a, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 grid place-items-center text-[10px] font-semibold text-primary-foreground">
              {a.who[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate">
                <span className="font-medium">{a.who}</span>{" "}
                <span className="text-muted-foreground">{a.what}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{a.when}</div>
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function CommentsPanel() {
  return (
    <ScrollArea className="h-full">
      <ul className="divide-y divide-border/50">
        {COMMENTS.map((c, i) => (
          <li key={i} className="px-4 py-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted grid place-items-center text-[10px] font-semibold">
                  {c.author[0]}
                </div>
                <span className="font-medium">{c.author}</span>
                <Badge variant="outline" className="text-[9px]">
                  {c.section}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">{c.when}</span>
            </div>
            <p className="text-muted-foreground pl-8">{c.body}</p>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  step,
  setStep,
  version,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  step: "draft" | "review" | "publish";
  setStep: (s: "draft" | "review" | "publish") => void;
  version: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Publish Version {version + 1}
          </DialogTitle>
          <DialogDescription>
            Review and ship your changes through the safe publish pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 flex items-center gap-2 text-xs">
          {(["draft", "review", "publish"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 border w-full",
                  step === s
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                <span className="h-5 w-5 rounded-full bg-background grid place-items-center text-[10px] font-semibold border border-border/60">
                  {i + 1}
                </span>
                <span className="capitalize">{s}</span>
              </div>
              {i < 2 ? <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" /> : null}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 4 changes will be applied
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Snapshot will be created
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Live site rolls forward
            atomically
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step !== "publish" ? (
            <Button onClick={() => setStep(step === "draft" ? "review" : "publish")}>
              Continue
            </Button>
          ) : (
            <Button
              className="bg-gradient-to-br from-primary to-primary/80 gap-1.5"
              onClick={() => onOpenChange(false)}
            >
              <Rocket className="h-3.5 w-3.5" /> Publish now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================== helpers ===========================

function mapSections(
  list: SectionNode[],
  id: string,
  fn: (s: SectionNode) => SectionNode,
): SectionNode[] {
  return list.map((s) => (s.id === id ? fn(s) : s));
}
function findSection(list: SectionNode[], id: string | null): SectionNode | null {
  if (!id) return null;
  for (const s of list) {
    if (s.id === id) return s;
    if (s.children) {
      const f = findSection(s.children, id);
      if (f) return f;
    }
  }
  return null;
}
