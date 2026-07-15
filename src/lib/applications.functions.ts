import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ applicationId: z.string().uuid() });

async function requireAdmin(supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app, error: appErr } = await supabaseAdmin
      .from("member_applications")
      .select("user_id, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (appErr) throw new Error(appErr.message);
    if (!app) throw new Error("Application not found");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: app.user_id, role: "member" });
    if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("member_applications")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: context.userId })
      .eq("id", data.applicationId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

export const denyApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app } = await supabaseAdmin
      .from("member_applications")
      .select("user_id")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!app) throw new Error("Application not found");

    // Remove any existing member role so a previously-approved user loses access.
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", app.user_id)
      .eq("role", "member");

    const { error: updErr } = await supabaseAdmin
      .from("member_applications")
      .update({ status: "denied", decided_at: new Date().toISOString(), decided_by: context.userId })
      .eq("id", data.applicationId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });

/**
 * First-run bootstrap: if no admin exists in user_roles, grant admin
 * (and member) to the currently signed-in caller. Safe because it
 * refuses once any admin exists.
 */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (error) throw new Error(error.message);
    if (existing && existing.length > 0) throw new Error("An admin already exists");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert([
        { user_id: context.userId, role: "admin" },
        { user_id: context.userId, role: "member" },
      ]);
    if (insErr && !insErr.message.includes("duplicate")) throw new Error(insErr.message);

    // Mark the caller's own application approved if it exists.
    await supabaseAdmin
      .from("member_applications")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: context.userId })
      .eq("user_id", context.userId);

    return { ok: true };
  });