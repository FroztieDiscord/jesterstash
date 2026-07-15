import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const idSchema = z.object({ applicationId: z.string().uuid() });
const emailSchema = z.object({ email: z.string().trim().email().max(255) });

async function requireAdmin(supabase: SupabaseClient<Database>, userId: string) {
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

/**
 * Admin-only: provision (or pre-approve) a team member by email and return a
 * one-time magic sign-in link the admin can share out-of-band.
 */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    let userId: string | null = null;

    // Try to create the auth user. If it already exists, look it up.
    const tempPassword =
      "Tmp!" + crypto.randomUUID().replace(/-/g, "") + "Aa1";
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
        throw new Error(createErr.message);
      }
      // Locate the existing user (paginate defensively).
      let page = 1;
      while (userId === null) {
        const { data: list, error: listErr } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw new Error(listErr.message);
        const found = list.users.find(
          (u) => u.email?.toLowerCase() === email,
        );
        if (found) userId = found.id;
        else if (list.users.length < 200) break;
        else page += 1;
      }
      if (!userId) throw new Error("Could not resolve existing user");
    } else {
      userId = created.user!.id;
    }

    // Ensure an approved application row exists.
    const { error: appErr } = await supabaseAdmin
      .from("member_applications")
      .upsert(
        {
          user_id: userId,
          email,
          status: "approved",
          decided_at: new Date().toISOString(),
          decided_by: context.userId,
        },
        { onConflict: "user_id" },
      );
    if (appErr) throw new Error(appErr.message);

    // Grant member role (ignore duplicate).
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "member" });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
      throw new Error(roleErr.message);
    }

    // Generate a magic sign-in link the admin can share.
    const { data: link, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr) throw new Error(linkErr.message);

    return {
      email,
      inviteUrl: link?.properties?.action_link ?? null,
    };
  });

/** Admin-only: revoke a member's access entirely. */
export const revokeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: app } = await supabaseAdmin
      .from("member_applications")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (!app) throw new Error("No such member");

    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", app.user_id)
      .eq("role", "member");

    await supabaseAdmin
      .from("member_applications")
      .update({
        status: "denied",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("user_id", app.user_id);

    return { ok: true };
  });