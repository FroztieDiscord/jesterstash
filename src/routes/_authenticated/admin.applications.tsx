import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Loader2, Inbox } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveApplication, denyApplication } from "@/lib/applications.functions";
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
  head: () => ({ meta: [{ title: "Applications — StockFlow" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
  const decided = apps?.filter((a) => a.status !== "pending") ?? [];

  return (
    <StockFlowLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Team Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve team members so they can record sales.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Pending</h2>
          <Badge variant="secondary" className="ml-auto rounded-full">{pending.length}</Badge>
        </div>
        {apps === null ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No pending applications</p>
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

      {decided.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Decided
          </h2>
          <ul className="divide-y divide-border">
            {decided.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.decided_at ? new Date(a.decided_at).toLocaleString() : ""}
                  </div>
                </div>
                {a.status === "approved" ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success-soft text-success-foreground hover:bg-success-soft">
                      Approved
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deny(a.id)}
                      disabled={busyId === a.id}
                    >
                      Revoke
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Denied</Badge>
                    <Button size="sm" onClick={() => approve(a.id)} disabled={busyId === a.id}>
                      Approve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </StockFlowLayout>
  );
}