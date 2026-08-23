import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LogOut,
  Sparkles,
  TrendingUp,
  History,
  Info,
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldCheck,
  Download,
} from "lucide-react";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Crests } from "@/components/Crests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  predict,
  MODEL_METRICS,
  MODEL_VERSION,
  GRADE_SCALE,
  CLASS_BANDS,
  type Inputs,
  type FeatureKey,
} from "@/lib/model";
import { buildRecommendations } from "@/lib/recommendations";
import { logAudit } from "@/lib/audit";
import { downloadCsv, stamp } from "@/lib/csv";
import { useRoles } from "@/hooks/useRoles";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Prediction dashboard | SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Enter your Level 100 and Level 200 GPAs and continuous assessment scores to forecast your final CGPA and degree classification.",
      },
      { property: "og:title", content: "Prediction dashboard | SSPS | UCC Students Success Prediction System" },
      {
        property: "og:description",
        content: "Your personal CGPA forecast, recommendations and prediction history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type FormState = Record<FeatureKey | "level300_gpa", string>;

const EMPTY: FormState = {
  level100_gpa: "",
  level200_gpa: "",
  level300_gpa: "",
  course_credits: "",
  attendance_pct: "",
  study_hours_per_week: "",
  participation_score: "",
  quiz1_score: "",
  quiz2_score: "",
  assignment_score: "",
  presentation_score: "",
  practical_score: "",
};

const OPTIONAL_FIELDS: { key: FeatureKey; label: string; hint: string; max: number }[] = [
  { key: "course_credits", label: "Total course credits", hint: "e.g. 16", max: 30 },
  { key: "attendance_pct", label: "Attendance (%)", hint: "0 - 100", max: 100 },
  { key: "study_hours_per_week", label: "Study hours / week", hint: "e.g. 8", max: 80 },
  { key: "quiz1_score", label: "Quiz 1 (%)", hint: "part of the 40% CA", max: 100 },
  { key: "quiz2_score", label: "Quiz 2 (%)", hint: "part of the 40% CA", max: 100 },
  { key: "assignment_score", label: "Assignment (%)", hint: "part of the 40% CA", max: 100 },
  { key: "presentation_score", label: "Presentation (%)", hint: "part of the 40% CA", max: 100 },
  { key: "practical_score", label: "Practical / Lab (%)", hint: "part of the 40% CA", max: 100 },
  { key: "participation_score", label: "Participation (%)", hint: "part of the 40% CA", max: 100 },
];

function toNumber(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isStaff } = useRoles();
  const staffNotes = useQuery({
    queryKey: ["recommendation-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_notes")
        .select("id, title, body, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof predict> | null>(null);
  const [usedInputs, setUsedInputs] = useState<Inputs | null>(null);
  const [actual, setActual] = useState("");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData = useMemo(
    () =>
      [...(history.data ?? [])]
        .reverse()
        .map((p, i) => ({
          n: i + 1,
          gpa: Number(p.predicted_gpa),
          date: new Date(p.created_at).toLocaleDateString(),
        })),
    [history.data],
  );

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handlePredict(e: React.FormEvent) {
    e.preventDefault();
    const l1 = toNumber(form.level100_gpa);
    const l2 = toNumber(form.level200_gpa);
    if (l1 === null || l2 === null || l1 < 0 || l1 > 4 || l2 < 0 || l2 > 4) {
      toast.error("Level 100 and Level 200 GPA are required and must be between 0.00 and 4.00");
      return;
    }
    const l3 = toNumber(form.level300_gpa);
    if (l3 !== null && (l3 < 0 || l3 > 4)) {
      toast.error("Level 300 GPA must be between 0.00 and 4.00");
      return;
    }
    const optional: Record<string, number> = {};
    for (const f of OPTIONAL_FIELDS) {
      const v = toNumber(form[f.key]);
      if (v !== null) {
        if (v < 0 || v > f.max) {
          toast.error(`${f.label} must be between 0 and ${f.max}`);
          return;
        }
        optional[f.key] = v;
      }
    }
    const inputs = {
      level100_gpa: l1,
      level200_gpa: l2,
      ...(l3 !== null ? { level300_gpa: l3 } : {}),
      ...optional,
    } as Inputs;

    const r = predict(inputs);
    setResult(r);
    setUsedInputs(inputs);
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid) {
      const { error } = await supabase.from("predictions").insert({
        user_id: uid,
        level100_gpa: l1,
        level200_gpa: l2,
        level300_gpa: l3,
        ...optional,

        predicted_gpa: Number(r.gpa.toFixed(4)),
        predicted_class: r.classification,
        pass_fail: r.passFail,
        confidence_low: Number(r.low.toFixed(4)),
        confidence_high: Number(r.high.toFixed(4)),
        model_version: MODEL_VERSION,
      });
      if (error) toast.error("Prediction shown, but could not be saved.");
      else {
        queryClient.invalidateQueries({ queryKey: ["predictions"] });
        void logAudit("create", "prediction", null, {
          predicted_gpa: Number(r.gpa.toFixed(2)),
          predicted_class: r.classification,
          model_version: MODEL_VERSION,
        });
      }
    }
    setSaving(false);
    toast.success("Prediction complete");
  }

  function exportHistory() {
    const rows = history.data ?? [];
    if (rows.length === 0) {
      toast.error("You have no saved predictions to export yet.");
      return;
    }
    downloadCsv(
      `ssps-my-predictions-${stamp()}.csv`,
      rows.map((p) => ({
        date: new Date(p.created_at).toISOString(),
        level100_gpa: p.level100_gpa,
        level200_gpa: p.level200_gpa,
        level300_gpa: p.level300_gpa ?? "",
        attendance_pct: p.attendance_pct ?? "",
        study_hours_per_week: p.study_hours_per_week ?? "",
        predicted_gpa: Number(p.predicted_gpa).toFixed(2),
        predicted_class: p.predicted_class,
        pass_fail: p.pass_fail,
        confidence_low: Number(p.confidence_low).toFixed(2),
        confidence_high: Number(p.confidence_high).toFixed(2),
        model_version: p.model_version,
      })),
    );
    void logAudit("export_csv", "prediction", null, { rows: rows.length });
    toast.success("Your prediction history has been downloaded.");
  }

  async function submitActual(e: React.FormEvent) {
    e.preventDefault();
    const v = toNumber(actual);
    if (v === null || v < 0 || v > 4) {
      toast.error("Enter your actual CGPA between 0.00 and 4.00");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const latest = history.data?.[0];
    const { error } = await supabase.from("actual_outcomes").insert({
      user_id: uid,
      prediction_id: latest?.id ?? null,
      actual_gpa: v,
    });
    if (error) toast.error(error.message);
    else {
      setActual("");
      void logAudit("create", "actual_outcome", latest?.id ?? null, { actual_gpa: v });
      toast.success("Thank you - your real result helps improve the model for everyone.");
    }
  }


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const advice = result && usedInputs ? buildRecommendations(usedInputs, result) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Crests
              size={40}
              className="rounded-xl border border-gold/50 bg-card px-3 py-1.5 shadow-[0_8px_24px_-14px_oklch(0.2_0.05_259/0.7)]"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">SSPS</p>
              <p className="text-xs text-muted-foreground">UCC Students Success Prediction System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {profile.data?.full_name ?? "Student"}
            </span>
            {isStaff ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Staff console
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="text-3xl">Predict your final CGPA</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Level 100 and Level 200 GPA are required. Every other field is optional &mdash; the more
          continuous assessment scores you supply, the sharper the forecast and the advice.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <form onSubmit={handlePredict} className="panel p-6">
            <h2 className="text-lg">Academic record</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="l1">Level 100 GPA *</Label>
                <Input
                  id="l1"
                  inputMode="decimal"
                  placeholder="0.00 - 4.00"
                  value={form.level100_gpa}
                  onChange={set("level100_gpa")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l2">Level 200 GPA *</Label>
                <Input
                  id="l2"
                  inputMode="decimal"
                  placeholder="0.00 - 4.00"
                  value={form.level200_gpa}
                  onChange={set("level200_gpa")}
                  required
                />
              </div>
            </div>

            <h3 className="mt-7 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Continuous assessment &amp; habits (optional)
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {OPTIONAL_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    inputMode="decimal"
                    placeholder={f.hint}
                    value={form[f.key]}
                    onChange={set(f.key)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={saving}>
                <Sparkles className="mr-2 h-4 w-4" /> Run prediction
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setForm(EMPTY)}>
                Clear
              </Button>
            </div>
          </form>

          <div className="space-y-6">
            {result ? (
              <div className="panel overflow-hidden">
                <div className="hero-overlay p-6">
                  <p className="text-xs uppercase tracking-widest text-primary-foreground/70">
                    Predicted final CGPA
                  </p>
                  <p className="mt-1 font-display text-6xl text-gold">{result.gpa.toFixed(2)}</p>
                  <p className="mt-2 text-lg text-primary-foreground">{result.classification}</p>
                  <p className="mt-1 text-xs text-primary-foreground/70">
                    80% confidence range {result.low.toFixed(2)} &ndash; {result.high.toFixed(2)}{" "}
                    &middot; {result.passFail}
                  </p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What is moving your prediction
                  </p>
                  <ul className="mt-3 space-y-2">
                    {result.drivers
                      .filter((d) => d.provided && Math.abs(d.contribution) > 0.005)
                      .slice(0, 5)
                      .map((d) => (
                        <li key={d.key} className="flex items-center gap-3 text-sm">
                          <span className="w-40 shrink-0 text-muted-foreground">{d.label}</span>
                          <span className="relative h-2 flex-1 rounded-full bg-secondary">
                            <span
                              className={`absolute top-0 h-2 rounded-full ${
                                d.contribution >= 0 ? "bg-success left-1/2" : "bg-destructive right-1/2"
                              }`}
                              style={{
                                width: `${Math.min(50, Math.abs(d.contribution) * 120)}%`,
                              }}
                            />
                          </span>
                          <span
                            className={`w-16 text-right font-medium ${
                              d.contribution >= 0 ? "text-success" : "text-destructive"
                            }`}
                          >
                            {d.contribution >= 0 ? "+" : ""}
                            {d.contribution.toFixed(2)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="panel flex h-full flex-col items-center justify-center p-10 text-center">
                <TrendingUp className="h-8 w-8 text-accent" />
                <h2 className="mt-4 text-lg">Your forecast will appear here</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Model: {MODEL_METRICS.algorithm}. Held-out accuracy R&sup2; ={" "}
                  {MODEL_METRICS.r2.toFixed(3)}, average error &plusmn;{MODEL_METRICS.mae.toFixed(2)}{" "}
                  GPA points on {MODEL_METRICS.trainingRows} student records.
                </p>
              </div>
            )}

            {advice.length > 0 && (
              <section className="panel p-6">
                <h2 className="flex items-center gap-2 text-lg">
                  <Target className="h-4 w-4 text-accent" /> Your recommendations
                </h2>
                <div className="mt-4 space-y-4">
                  {advice.map((a) => (
                    <article
                      key={a.title}
                      className={`rounded-lg border-l-4 bg-secondary/50 p-4 ${
                        a.tone === "focus"
                          ? "border-destructive"
                          : a.tone === "good"
                            ? "border-success"
                            : "border-accent"
                      }`}
                    >
                      <h3 className="flex items-start gap-2 text-sm font-semibold">
                        {a.tone === "focus" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        ) : a.tone === "good" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        )}
                        {a.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {(staffNotes.data?.length ?? 0) > 0 && (
              <section className="panel p-6">
                <h2 className="flex items-center gap-2 text-lg">
                  <Info className="h-4 w-4 text-accent" /> Notices from CoDE staff
                </h2>
                <div className="mt-4 space-y-4">
                  {(staffNotes.data ?? []).map((n) => (
                    <article key={n.id} className="rounded-lg border-l-4 border-gold bg-secondary/50 p-4">
                      <h3 className="text-sm font-semibold">{n.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg">
                <History className="h-4 w-4 text-accent" /> Prediction history
              </h2>
              <Button variant="outline" size="sm" onClick={exportHistory}>
                <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>

            {chartData.length > 1 ? (
              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <RTooltip />
                    <Line
                      type="monotone"
                      dataKey="gpa"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Run at least two predictions to see your trend over time.
              </p>
            )}
            <ul className="mt-4 divide-y divide-border text-sm">
              {(history.data ?? []).slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </span>
                  <span className="font-medium">
                    {Number(p.predicted_gpa).toFixed(2)} &middot; {p.predicted_class}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <form onSubmit={submitActual} className="panel p-6">
              <h2 className="text-lg">Help the system learn</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                When your real results are published, enter your actual CGPA. Reported outcomes are
                stored against your predictions and are used to retrain and recalibrate the model.
              </p>
              <div className="mt-4 flex gap-3">
                <Input
                  inputMode="decimal"
                  placeholder="Actual CGPA (0.00 - 4.00)"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  Submit
                </Button>
              </div>
            </form>

            <div className="panel p-6">
              <h2 className="text-lg">UCC grading scale</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2">Grade</th>
                    <th className="pb-2">Mark</th>
                    <th className="pb-2 text-right">Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {GRADE_SCALE.map((g) => (
                    <tr key={g.grade}>
                      <td className="py-1.5 font-medium">{g.grade}</td>
                      <td className="py-1.5 text-muted-foreground">{g.range}</td>
                      <td className="py-1.5 text-right">{g.point.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-muted-foreground">
                Classification bands: {CLASS_BANDS.map((b) => `${b.name} ${b.min.toFixed(2)}+`).join(" \u00b7 ")}
              </p>
            </div>
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Predictions are statistical guidance produced by model {MODEL_VERSION} and are not an
          official University of Cape Coast result.
        </p>
      </main>
    </div>
  );
}
