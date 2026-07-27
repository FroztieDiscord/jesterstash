import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Loader2, Inbox, UserPlus, Copy, ShieldCheck } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  approveApplication,
  denyApplication,
  inviteMember,
  revokeMember,
} from "@/lib/applications.functions";
import { toast } from "sonner";

type Application = {
  id: string;
  email: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  decided_at: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/applications")({
  beforeLoad: ({ context }) => {
    // Route context is populated by the _authenticated gate.
    if (!(context as { isAdmin?: boolean }).isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Team Access — Jester's Stash" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ email: string; url: string | null } | null>(null);

  async function reload() {
    const { data, error } = await supabase
      .from("member_applications")
      .select("id, email, status, created_at, decided_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setApps((data ?? []) as Application[]);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await approveApplication({ data: { applicationId: id } });
      toast.success("Approved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }
  async function deny(id: string) {
    setBusyId(id);
    try {
      await denyApplication({ data: { applicationId: id } });
      toast.success("Denied");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const pending = apps?.filter((a) => a.status === "pending") ?? [];
  const approved = apps?.filter((a) => a.status === "approved") ?? [];
  const denied = apps?.filter((a) => a.status === "denied") ?? [];

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setInviting(true);
    try {
      const res = await inviteMember({ data: { email } });
      setLastInvite({ email: res.email, url: res.inviteUrl });
      setInviteEmail("");
      toast.success(`Invited ${res.email}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(email: string) {
    setBusyId(email);
    try {
      await revokeMember({ data: { email } });
      toast.success(`Revoked ${email}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resend(email: string) {
    setBusyId("resend:" + email);
    try {
      const res = await inviteMember({ data: { email } });
      setLastInvite({ email: res.email, url: res.inviteUrl });
      toast.success(`New sign-in link ready for ${email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink() {
    if (!lastInvite?.url) return;
    try {
      await navigator.clipboard.writeText(lastInvite.url);
      toast.success("Sign-in link copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <StockFlowLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Team Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite team members by email. They get a one-time sign-in link you
          share with them.
        </p>
      </div>

      <section className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Invite a team member</h2>
        </div>
        <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={inviting} className="h-10 sm:w-auto">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
          </Button>
        </form>
        {lastInvite && (
          <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" /> Invite ready for {lastInvite.email}
            </div>
            {lastInvite.url ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Send this one-time sign-in link to your teammate. It signs them
                  in and they can set their own password from their profile.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                    {lastInvite.url}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Account created. Share their email + a password reset link so
                they can set a password.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Pending requests</h2>
          <Badge variant="secondary" className="ml-auto rounded-full">{pending.length}</Badge>
        </div>
        {apps === null ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending. Invite-only mode is on.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Applied {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deny(a.id)}
                    disabled={busyId === a.id}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Deny
                  </Button>
                  <Button size="sm" onClick={() => approve(a.id)} disabled={busyId === a.id}>
                    {busyId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </>
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Approved members ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No approved members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {approved.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Added {a.decided_at ? new Date(a.decided_at).toLocaleString() : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resend(a.email)}
                    disabled={busyId === "resend:" + a.email}
                  >
                    {busyId === "resend:" + a.email ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Resend link"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revoke(a.email)}
                    disabled={busyId === a.email}
                  >
                    {busyId === a.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Revoke"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {denied.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Revoked / denied
          </h2>
          <ul className="divide-y divide-border">
            {denied.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.email}</div>
                </div>
                <Badge variant="destructive">Revoked</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </StockFlowLayout>
  );
}