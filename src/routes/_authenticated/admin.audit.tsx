import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert, RefreshCw, Radio, Download } from "lucide-react";
import { StockFlowLayout } from "@/components/StockFlowLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [live, setLive] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toTs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : null;
    return rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
  }, [rows, fromDate, toDate]);

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

  useEffect(() => {
    const channel = supabase
      .channel("security_audit_log_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "security_audit_log" },
        (payload) => {
          const row = payload.new as AuditEntry;
          setRows((prev) => {
            const next = prev ? [row, ...prev.filter((r) => r.id !== row.id)] : [row];
            return next.slice(0, 500);
          });
          toast.message("New audit event", { description: `${row.function_name} · ${row.action}` });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function exportCsv() {
    setExporting(true);
    try {
      let query = supabase
        .from("security_audit_log")
        .select("id, function_name, actor_id, target_user_id, target_email, action, details, created_at")
        .order("created_at", { ascending: false });
      if (fromDate) query = query.gte("created_at", new Date(fromDate + "T00:00:00").toISOString());
      if (toDate) query = query.lte("created_at", new Date(toDate + "T23:59:59.999").toISOString());
      const { data, error } = await query;
      if (error) throw error;
      const entries = (data ?? []) as AuditEntry[];
      if (entries.length === 0) {
        toast.message("Nothing to export", { description: "No audit entries in that range." });
        return;
      }
      const headers = ["created_at", "function_name", "action", "actor_id", "target_user_id", "target_email", "details"];
      const escape = (v: unknown) => {
        const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const csv = [
        headers.join(","),
        ...entries.map((r) =>
          [r.created_at, r.function_name, r.action, r.actor_id, r.target_user_id, r.target_email, r.details]
            .map(escape)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const range = `${fromDate || "all"}_${toDate || "now"}`;
      a.href = url;
      a.download = `audit-log_${range}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

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
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <Radio className={`h-3 w-3 ${live ? "text-gold animate-pulse" : "text-muted-foreground/50"}`} />
              {live ? "Live" : "Offline"}
            </span>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-from" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">From</Label>
            <Input id="audit-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[160px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="audit-to" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">To</Label>
            <Input id="audit-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[160px]" />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }} className="h-9">
              Clear
            </Button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredRows?.length ?? 0} shown
            </span>
            <Button size="sm" onClick={exportCsv} disabled={exporting} className="bg-gold text-background hover:bg-gold/90">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl">
          {rows === null ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filteredRows!.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No audit events in this range.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredRows!.map((r) => (
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