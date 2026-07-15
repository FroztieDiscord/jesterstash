import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "apply"]).catch("signin").default("signin"),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Sign in — StockFlow" }] }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isApply = mode === "apply";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (isApply) {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Application submitted. You'll get access once approved.");
        navigate({ to: "/pending" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Package className="h-4 w-4" />
          </div>
          StockFlow
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isApply ? "Apply for access" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isApply
              ? "Submit your email and a password. An admin will review and approve you."
              : "Sign in with your admin or approved team member account."}
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
              autoComplete={isApply ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy} className="h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isApply ? "Submit application" : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {isApply ? (
            <Link to="/auth" search={{ mode: "signin" }} className="text-primary hover:underline">
              Already have access? Sign in
            </Link>
          ) : (
            <Link to="/auth" search={{ mode: "apply" }} className="text-primary hover:underline">
              Team member? Apply for access
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}