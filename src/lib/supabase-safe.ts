// Safe Supabase wrapper for legacy admin modules.
//
// The generated Supabase types are strict and reject query shapes used by
// pre-Phase-4 admin flows (AcademicStructureManager, FlashCardManagerFlow,
// BulkUploadMcqsDialog, AnalyticsReportsFlow, etc.). Rather than rewriting
// those modules or weakening the generated types, this wrapper re-exports
// the existing browser client cast as `SupabaseClient<any>` so legacy code
// can compile while runtime behavior is preserved 1:1.
//
// Use this ONLY from legacy code paths that hit the type wall. New code
// should keep importing the strictly-typed `supabase` from
// "@/integrations/supabase/client".

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedSupabase } from "@/integrations/supabase/client";

export const supabaseSafe = typedSupabase as unknown as SupabaseClient<any, any, any>;

/** Convenience: typed table accessor with relaxed row typing. */
export const fromSafe = (table: string) => supabaseSafe.from(table);

/** Re-export for legacy modules importing the default name. */
export default supabaseSafe;