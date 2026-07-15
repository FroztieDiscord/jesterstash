// Managed auth gate for the whole _authenticated subtree.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (roleSet.size === 0) throw redirect({ to: "/pending" });

    return { user: data.user, isAdmin: roleSet.has("admin"), isMember: roleSet.has("member") };
  },
  component: () => <Outlet />,
});