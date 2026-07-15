import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Package, Lock, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1);
      if (roles && roles.length > 0) throw redirect({ to: "/dashboard" });
      throw redirect({ to: "/pending" });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">StockFlow</div>
            <div className="text-xs text-muted-foreground">Inventory &amp; sales</div>
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Team access, by approval</h1>
          <p className="text-sm text-muted-foreground">
            Admins run the shop. Team members apply and start recording sales once approved.
          </p>
        </div>
        <div className="grid gap-2">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-primary)] hover:opacity-95"
          >
            <Lock className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "apply" }}
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            <UserPlus className="h-4 w-4" />
            Apply as a team member
          </Link>
        </div>
      </div>
    </div>
  );
}
