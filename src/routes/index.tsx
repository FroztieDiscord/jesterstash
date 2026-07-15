import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Package, Lock, ShieldCheck } from "lucide-react";
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
          <h1 className="text-2xl font-bold tracking-tight">Private, invite-only</h1>
          <p className="text-sm text-muted-foreground">
            StockFlow is locked to approved team members. Sign in with the
            credentials your admin shared with you.
          </p>
        </div>
        <div className="grid gap-2">
          <Link
            to="/auth"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-primary)] hover:opacity-95"
          >
            <Lock className="h-4 w-4" />
            Sign in
          </Link>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            No public sign-up — access is granted by the admin
          </div>
        </div>
      </div>
    </div>
  );
}
