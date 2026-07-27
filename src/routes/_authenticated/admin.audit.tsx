import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type AuditEntry = {
  id: string;
  function_name: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/audit")({
  beforeLoad: ({ context }) => {
    if (!(context as { isAdmin?: boolean }).isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Audit Log — Jester's Stash" },
      { name: "description", content: "Immutable record of trusted database function calls affecting members and roles." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_audit_log")
      .select("id, function_name, actor_id, target_user_id, target_email, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as AuditEntry[]);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <StockFlowLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-gold" />
              Security
            </div>
            <h1 className="font-display text-4xl font-normal tracking-tight text-gold">Audit Log</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every call to the trusted database functions that touch member applications or role
              assignments is recorded here. Entries cannot be edited or deleted from the app.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </header>

        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl">
          {rows === null ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No audit events recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {r.function_name}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{r.action}</span>
                    </div>
                    <time className="text-xs tabular-nums text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </time>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="text-foreground/70">Target:</span>{" "}
                      {r.target_email ?? r.target_user_id ?? "—"}
                    </div>
                    <div>
                      <span className="text-foreground/70">Actor:</span> {r.actor_id ?? "system"}
                    </div>
                  </div>
                  {r.details && Object.keys(r.details).length > 0 && (
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
{JSON.stringify(r.details, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StockFlowLayout>
  );
}