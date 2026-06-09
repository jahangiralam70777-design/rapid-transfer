/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only RBAC enforcement helper. Single source of truth for "can the
// current user perform <permission>?" — backed by public.has_permission().
// Every check is recorded in public.admin_action_log.

export async function assertPermission(
  supabase: any,
  userId: string,
  permission: string,
  action?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _permission: permission,
  });

  const allowed = !error && data === true;

  // Best-effort audit log — never block the user-facing operation on a logging failure.
  try {
    await supabase.from("admin_action_log").insert({
      user_id: userId,
      permission,
      action: action ?? null,
      allowed,
      metadata: metadata ?? null,
    });
  } catch {
    // swallow — auditing must not break the request
  }

  if (error) throw new Error(`Permission check failed: ${error.message}`);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}
