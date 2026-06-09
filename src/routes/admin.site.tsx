import { createFileRoute } from "@tanstack/react-router";
import SiteManagementDesigner from "@/components/admin/SiteManagementDesigner";

export const Route = createFileRoute("/admin/site")({
  component: SiteManagementDesigner,
  head: () => ({
    meta: [
      { title: "Site Designer · CA Aspire BD Admin" },
      {
        name: "description",
        content:
          "Webflow-style site designer: 3-panel editor, live preview, version history, and safe publish pipeline.",
      },
    ],
  }),
});
