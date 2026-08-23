import { supabase } from "@/integrations/supabase/client";

/**
 * Append-only audit trail. Every signed-in user may write entries for
 * themselves; only staff and administrators can read the trail back.
 * Failures are swallowed on purpose - auditing must never break a user action.
 */
export async function logAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  detail: Record<string, unknown> = {},
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_label: user.email ?? user.phone ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      detail: detail as never,
    });
  } catch {
    /* auditing is best-effort */
  }
}
