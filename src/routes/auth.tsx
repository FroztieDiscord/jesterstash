import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: () => ({}) as Record<string, never>,
  head: () => ({
    meta: [
      { title: "Sign in — Jester's Stash" },
      { name: "description", content: "Sign in to Jester's Stash, the private inventory and sales portal. Access is restricted to approved team members with admin-issued credentials." },
      { property: "og:title", content: "Sign in — Jester's Stash" },
      { property: "og:description", content: "Sign in to the private Jester's Stash inventory and sales portal." },
      { property: "og:url", content: "https://inventoryprojectschool.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://inventoryprojectschool.lovable.app/auth" }],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Public sign-up is disabled — this app is invite-only. Accounts are created
  // by an admin via the Team Access panel.
  const mode: "signin" = "signin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Package className="h-4 w-4" />
          </div>
          Jester&rsquo;s Stash
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This app is invite-only. Sign in with the credentials your admin shared with you.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Need access? Ask an admin to invite your email.
        </div>
      </div>
    </main>
  );
}