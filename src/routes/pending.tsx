import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { claimAdmin } from "@/lib/applications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/pending")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Application pending — Jester's Stash" },
      { name: "description", content: "Your Jester's Stash account is awaiting admin approval. Access to the private inventory and sales portal unlocks once an admin approves your membership." },
      { property: "og:title", content: "Application pending — Jester's Stash" },
      { property: "og:description", content: "Awaiting admin approval to access the private Jester's Stash portal." },
      { property: "og:url", content: "https://inventoryprojectschool.lovable.app/pending" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://inventoryprojectschool.lovable.app/pending" }],
  }),
  component: PendingPage,
});

function PendingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [anyAdminExists, setAnyAdminExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setEmail(data.user.email ?? null);

      // Check own roles: if already has one, forward to dashboard
      const { data: mine } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1);
      if (mine && mine.length > 0) {
        navigate({ to: "/dashboard" });
        return;
      }

      // Cannot see all admins via RLS — probe by calling claim: instead, use a select on user_roles for admin.
      // We surface "no admin yet" from a public perspective: query user_roles where role=admin. Non-admins can't see it
      // (RLS), so a returned count of 0 doesn't necessarily mean no admin exists. As a UX shortcut we always show the
      // claim button; the server refuses if an admin already exists.
      setAnyAdminExists(null);
      setChecking(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onClaim() {
    setClaiming(true);
    try {
      await claimAdmin();
      toast.success("You're now the admin.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim admin");
    } finally {
      setClaiming(false);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Application pending</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {email ? (
              <>
                We received your application for <span className="font-medium text-foreground">{email}</span>.
                You'll be able to sign in once an admin approves it.
              </>
            ) : (
              "You'll be able to sign in once an admin approves your application."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border p-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">First time here?</div>
              <p className="mt-1">
                If no admin has claimed this workspace yet, you can claim admin access now. This
                option stops working once an admin exists.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onClaim}
                disabled={claiming || checking}
              >
                {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Claim admin"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}