import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  LineChart as LineChartIcon,
  Lightbulb,
  Trash2,
  Plus,
  ArrowLeft,
  Lock,
  Download,
  ScrollText,
  Image as ImageIcon,
  LayoutTemplate,
  History,
  BarChart3,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Crests, BRANDING_KEYS, useBranding } from "@/components/Crests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { downloadCsv, stamp } from "@/lib/csv";
import { useRoles, type AppRole } from "@/hooks/useRoles";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Staff console | SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Staff-only console for managing SSPS students, reviewing aggregated CGPA predictions and publishing study recommendations.",
      },
      { property: "og:title", content: "Staff console | SSPS" },
      {
        property: "og:description",
        content: "Manage students, aggregated results and recommendations for SSPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConsole,
});

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function AdminConsole() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStaff, isAdmin, isLoading } = useRoles();

  const students = useQuery({
    queryKey: ["admin", "profiles"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, student_id, programme, study_centre, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const predictions = useQuery({
    queryKey: ["admin", "predictions"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("id, user_id, predicted_gpa, predicted_class, pass_fail, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const outcomes = useQuery({
    queryKey: ["admin", "outcomes"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actual_outcomes")
        .select("id, user_id, actual_gpa, prediction_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const notes = useQuery({
    queryKey: ["admin", "notes"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_notes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const roles = useQuery({
    queryKey: ["admin", "roles"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const auditLogs = useQuery({
    queryKey: ["admin", "audit"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const templates = useQuery({
    queryKey: ["admin", "templates"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const noteVersions = useQuery({
    queryKey: ["admin", "note-versions"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_note_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const branding = useBranding();

  const [note, setNote] = useState({ title: "", body: "", category: "general" });
  const [template, setTemplate] = useState({ name: "", title: "", body: "", category: "general" });
  const [roleTarget, setRoleTarget] = useState("");
  const [roleValue, setRoleValue] = useState<AppRole>("staff");
  const [uploading, setUploading] = useState<string | null>(null);
  const uccInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);


  const stats = useMemo(() => {
    const preds = predictions.data ?? [];
    const avg =
      preds.length > 0
        ? preds.reduce((s, p) => s + Number(p.predicted_gpa), 0) / preds.length
        : 0;
    const byClass = new Map<string, number>();
    for (const p of preds) byClass.set(p.predicted_class, (byClass.get(p.predicted_class) ?? 0) + 1);
    const atRisk = preds.filter((p) => p.pass_fail !== "Pass").length;
    return {
      avg,
      byClass: [...byClass.entries()].sort((a, b) => b[1] - a[1]),
      atRisk,
    };
  }, [predictions.data]);

  const predictionCountByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of predictions.data ?? []) m.set(p.user_id, (m.get(p.user_id) ?? 0) + 1);
    return m;
  }, [predictions.data]);

  /** Predictions per day plus the running average predicted CGPA for that day. */
  const analytics = useMemo(() => {
    const byDay = new Map<string, { count: number; sum: number }>();
    for (const p of predictions.data ?? []) {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      const cur = byDay.get(day) ?? { count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += Number(p.predicted_gpa);
      byDay.set(day, cur);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([day, v]) => ({
        day: new Date(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        predictions: v.count,
        avgGpa: Number((v.sum / v.count).toFixed(2)),
      }));
  }, [predictions.data]);

  function exportPredictions() {
    const rows = predictions.data ?? [];
    if (rows.length === 0) { toast.error("No predictions to export yet."); return; }
    downloadCsv(
      `ssps-predictions-${stamp()}.csv`,
      rows.map((p) => ({
        date: new Date(p.created_at).toISOString(),
        student: nameOf(p.user_id),
        predicted_gpa: Number(p.predicted_gpa).toFixed(2),
        predicted_class: p.predicted_class,
        pass_fail: p.pass_fail,
      })),
    );
    void logAudit("export_csv", "predictions", null, { rows: rows.length });
  }

  function exportStudents() {
    const rows = students.data ?? [];
    if (rows.length === 0) { toast.error("No students to export yet."); return; }
    downloadCsv(
      `ssps-students-${stamp()}.csv`,
      rows.map((s) => ({
        full_name: s.full_name ?? "",
        student_id: s.student_id ?? "",
        programme: s.programme ?? "",
        study_centre: s.study_centre ?? "",
        predictions: predictionCountByUser.get(s.id) ?? 0,
        registered: new Date(s.created_at).toISOString(),
      })),
    );
    void logAudit("export_csv", "profiles", null, { rows: rows.length });
  }

  function exportAudit() {
    const rows = auditLogs.data ?? [];
    if (rows.length === 0) { toast.error("The audit trail is empty."); return; }
    downloadCsv(
      `ssps-audit-trail-${stamp()}.csv`,
      rows.map((a) => ({
        timestamp: new Date(a.created_at).toISOString(),
        actor: a.actor_label ?? a.actor_id ?? "",
        action: a.action,
        entity: a.entity,
        entity_id: a.entity_id ?? "",
        detail: JSON.stringify(a.detail ?? {}),
      })),
    );
  }

  async function addTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!template.name.trim() || !template.title.trim() || !template.body.trim()) {
      toast.error("A template needs a name, a title and a body.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("recommendation_templates").insert({
      name: template.name.trim(),
      title: template.title.trim(),
      body: template.body.trim(),
      category: template.category,
      created_by: auth.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    setTemplate({ name: "", title: "", body: "", category: "general" });
    toast.success("Template saved.");
    void logAudit("create", "recommendation_template", null, { name: template.name });
    queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase.from("recommendation_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void logAudit("delete", "recommendation_template", id, {});
    queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
  }

  /** Downscale the chosen crest in the browser and store it as an inline PNG. */
  async function uploadCrest(key: string, file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose a PNG or JPG image."); return; }
    setUploading(key);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const maxH = 320;
      const scale = Math.min(1, maxH / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const value = canvas.toDataURL("image/png");
      if (value.length > 900_000) {
        toast.error("That image is too large. Please use a smaller crest file.");
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("branding_settings")
        .upsert({ key, value, updated_by: auth.user?.id ?? null }, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }
      toast.success("Crest updated.");
      void logAudit("update", "branding", key, {});
      queryClient.invalidateQueries({ queryKey: ["branding"] });
    } finally {
      setUploading(null);
    }
  }

  async function resetCrest(key: string) {
    const { error } = await supabase.from("branding_settings").delete().eq("key", key);
    if (error) { toast.error(error.message); return; }
    toast.success("Reverted to the built-in crest.");
    void logAudit("reset", "branding", key, {});
    queryClient.invalidateQueries({ queryKey: ["branding"] });
  }


  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.title.trim() || !note.body.trim()) {
      toast.error("Give the recommendation a title and body.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("recommendation_notes").insert({
      title: note.title.trim(),
      body: note.body.trim(),
      category: note.category,
      created_by: auth.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    setNote({ title: "", body: "", category: "general" });
    toast.success("Recommendation published.");
    void logAudit("create", "recommendation_note", null, { title: note.title });
    queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "note-versions"] });
  }

  async function toggleNote(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("recommendation_notes")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    void logAudit("update", "recommendation_note", id, { is_active: isActive });
    queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "note-versions"] });
  }


  async function deleteNote(id: string) {
    const { error } = await supabase.from("recommendation_notes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Recommendation removed.");
    void logAudit("delete", "recommendation_note", id, {});
    queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
  }

  async function grantRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTarget) { toast.error("Pick a student or staff member first."); return; }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: roleTarget, role: roleValue });
    if (error) { toast.error(error.message); return; }
    toast.success("Role granted.");
    void logAudit("grant_role", "user_role", roleTarget, { role: roleValue });
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
  }

  async function revokeRole(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Role revoked.");
    void logAudit("revoke_role", "user_role", id, {});
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
  }


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking your access&hellip;
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="panel max-w-md p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl">Staff access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is restricted to CoDE staff and administrators. Student records stay
            locked at the database level, so nothing here is exposed to your account.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to my dashboard
          </Button>
        </div>
      </div>
    );
  }

  const nameOf = (id: string) =>
    students.data?.find((s) => s.id === id)?.full_name ?? `${id.slice(0, 8)}\u2026`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Crests
              size={40}
              className="rounded-xl border border-gold/50 bg-card px-3 py-1.5 shadow-[0_8px_24px_-14px_oklch(0.2_0.05_259/0.7)]"
            />
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold leading-tight">
                SSPS staff console <ShieldCheck className="h-4 w-4 text-gold" />
              </p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Administrator" : "Staff"} access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/model-evaluation">
                <BarChart3 className="mr-2 h-3.5 w-3.5" /> Model evaluation
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" /> My dashboard
              </Link>
            </Button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl">Programme overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aggregated, read-only insight across all registered students. Individual records remain
          protected by row level security &mdash; staff can read, only students can edit their own.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Students" value={String(students.data?.length ?? 0)} />
          <StatCard
            icon={LineChartIcon}
            label="Predictions"
            value={String(predictions.data?.length ?? 0)}
            sub={`${outcomes.data?.length ?? 0} confirmed results`}
          />
          <StatCard
            icon={LineChartIcon}
            label="Average predicted CGPA"
            value={stats.avg ? stats.avg.toFixed(2) : "--"}
            sub="4.00 scale"
          />
          <StatCard
            icon={ShieldCheck}
            label="Flagged at risk"
            value={String(stats.atRisk)}
            sub="Predicted below the pass mark"
          />
        </div>

        <Tabs defaultValue="students" className="mt-10">
          <TabsList className="flex-wrap">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="results">Aggregated results</TabsTrigger>
            <TabsTrigger value="notes">Recommendations</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            {isAdmin ? <TabsTrigger value="roles">Roles</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={exportStudents}>
                <Download className="mr-2 h-3.5 w-3.5" /> Export students CSV
              </Button>
            </div>
            <div className="panel overflow-x-auto p-2">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Study centre</TableHead>
                    <TableHead className="text-right">Predictions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(students.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name ?? "\u2014"}</TableCell>
                      <TableCell>{s.student_id ?? "\u2014"}</TableCell>
                      <TableCell>{s.programme ?? "\u2014"}</TableCell>
                      <TableCell>{s.study_centre ?? "\u2014"}</TableCell>
                      <TableCell className="text-right">
                        {predictionCountByUser.get(s.id) ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No students registered yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="panel p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg">Prediction activity &amp; average CGPA</h2>
                  <p className="text-xs text-muted-foreground">
                    Bars: predictions submitted per day. Line: average predicted CGPA that day.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={exportPredictions}>
                  <Download className="mr-2 h-3.5 w-3.5" /> Export predictions CSV
                </Button>
              </div>
              {analytics.length > 0 ? (
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 4]}
                        tick={{ fontSize: 11 }}
                      />
                      <RTooltip />
                      <Bar
                        yAxisId="left"
                        dataKey="predictions"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgGpa"
                        stroke="var(--gold, var(--chart-2))"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No predictions recorded yet.</p>
              )}
            </div>

            <div className="panel p-6">
              <h2 className="text-lg">Predicted classification spread</h2>
              <div className="mt-4 space-y-3">
                {stats.byClass.map(([cls, count]) => {
                  const total = predictions.data?.length || 1;
                  return (
                    <div key={cls}>
                      <div className="flex justify-between text-sm">
                        <span>{cls}</span>
                        <span className="text-muted-foreground">
                          {count} ({Math.round((count / total) * 100)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats.byClass.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No predictions recorded yet.</p>
                ) : null}
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="text-lg">Latest predictions</h2>
              <div className="mt-4 space-y-3">
                {(predictions.data ?? []).slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
                  >
                    <span className="font-medium">{nameOf(p.user_id)}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={p.pass_fail === "Pass" ? "secondary" : "destructive"}>
                        {p.pass_fail}
                      </Badge>
                      <span className="tabular-nums">{Number(p.predicted_gpa).toFixed(2)}</span>
                    </span>
                  </div>
                ))}
                {predictions.data?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <form onSubmit={addNote} className="panel p-6">
              <h2 className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-4 w-4 text-gold" /> Publish a recommendation
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown to signed-in students alongside their automated coaching (CA 40% / Exam 60%).
              </p>
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nt">Title</Label>
                  <Input
                    id="nt"
                    value={note.title}
                    onChange={(e) => setNote({ ...note, title: e.target.value })}
                    placeholder="Prepare early for end-of-semester exams"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc">Category</Label>
                  <Select
                    value={note.category}
                    onValueChange={(v) => setNote({ ...note, category: v })}
                  >
                    <SelectTrigger id="nc">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="continuous-assessment">
                        Continuous assessment (40%)
                      </SelectItem>
                      <SelectItem value="examination">Examination (60%)</SelectItem>
                      <SelectItem value="at-risk">At-risk support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nb">Advice</Label>
                  <Textarea
                    id="nb"
                    rows={5}
                    value={note.body}
                    onChange={(e) => setNote({ ...note, body: e.target.value })}
                    placeholder="Quizzes, assignments and presentations carry 40%..."
                  />
                </div>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" /> Publish
                </Button>
              </div>
            </form>

            <div className="panel p-6">
              <h2 className="text-lg">Published recommendations</h2>
              <div className="mt-4 space-y-4">
                {(notes.data ?? []).map((n) => (
                  <div key={n.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{n.title}</p>
                        <Badge variant="outline" className="mt-1">
                          {n.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={n.is_active}
                          onCheckedChange={(v) => toggleNote(n.id, v)}
                          aria-label="Visible to students"
                        />
                        <Button variant="ghost" size="icon" onClick={() => deleteNote(n.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                      {n.body}
                    </p>
                  </div>
                ))}
                {notes.data?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recommendations published yet.
                  </p>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="roles" className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <form onSubmit={grantRole} className="panel p-6">
                <h2 className="text-lg">Grant a role</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Roles are stored in a dedicated table and checked server-side, so they cannot be
                  faked from the browser.
                </p>
                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Person</Label>
                    <Select value={roleTarget} onValueChange={setRoleTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a registered user" />
                      </SelectTrigger>
                      <SelectContent>
                        {(students.data ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name ?? s.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={roleValue} onValueChange={(v) => setRoleValue(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">Grant role</Button>
                </div>
              </form>

              <div className="panel p-6">
                <h2 className="text-lg">Current role assignments</h2>
                <div className="mt-4 space-y-2">
                  {(roles.data ?? []).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0"
                    >
                      <span>{nameOf(r.user_id)}</span>
                      <span className="flex items-center gap-2">
                        <Badge>{r.role}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => revokeRole(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </div>
                  ))}
                  {roles.data?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </main>
    </div>
  );
}
