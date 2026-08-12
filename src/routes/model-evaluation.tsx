import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, CheckCircle2, Gauge, Sigma } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Crests } from "@/components/Crests";
import { Button } from "@/components/ui/button";
import { COEF, FEATURE_LABELS, MODEL_METRICS, MODEL_VERSION, type FeatureKey } from "@/lib/model";

export const Route = createFileRoute("/model-evaluation")({
  head: () => ({
    meta: [
      { title: "Model evaluation | SSPS UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Evaluation of the SSPS CGPA prediction model: MAE, RMSE and R-squared for Ridge Regression and the Random Forest baseline, with charts and interpretation.",
      },
      { property: "og:title", content: "Model evaluation | SSPS" },
      {
        property: "og:description",
        content:
          "MAE, RMSE and R-squared results for the SSPS CGPA prediction model, with charts and written interpretation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelEvaluation,
});

/** Held-out test-set results recorded during training (scikit-learn, 80/20 split). */
const MODELS = [
  {
    name: "Ridge Regression",
    deployed: true,
    mae: 0.171,
    rmse: 0.204,
    r2: 0.842,
  },
  {
    name: "Random Forest",
    deployed: false,
    mae: 0.166,
    rmse: 0.205,
    r2: 0.842,
  },
] as const;

const COEF_DATA = (Object.keys(COEF) as FeatureKey[])
  .map((k) => ({ label: FEATURE_LABELS[k], value: COEF[k] }))
  .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

function Stat({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{caption}</p>
    </div>
  );
}

function ModelEvaluation() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Crests
              size={36}
              className="w-fit rounded-xl border border-gold/50 bg-primary-foreground px-3 py-1.5 shadow-sm"
            />
            <span className="hidden text-sm font-semibold sm:block">SSPS &middot; Model evaluation</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">Model evaluation</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
          The deployed predictor is a cross-validated{" "}
          <strong className="text-foreground">Ridge Regression</strong> (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{MODEL_VERSION}</code>) trained in
          Python (scikit-learn) on {MODEL_METRICS.trainingRows.toLocaleString()} College of Distance
          Education student records. All figures below come from the held-out test split, i.e. records
          the model never saw during training, and are expressed in CGPA points on the UCC 4.00 scale.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat
            icon={Gauge}
            label="MAE"
            value={MODEL_METRICS.mae.toFixed(3)}
            caption="Mean Absolute Error — on average the predicted CGPA is off the real CGPA by about 0.17 of a grade point."
          />
          <Stat
            icon={Sigma}
            label="RMSE"
            value={MODELS[0].rmse.toFixed(3)}
            caption="Root Mean Squared Error — slightly above the MAE, showing few large outlier errors."
          />
          <Stat
            icon={BarChart3}
            label="R²"
            value={MODEL_METRICS.r2.toFixed(3)}
            caption="Coefficient of determination — the model explains about 84.2% of the variation in final CGPA."
          />
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Error comparison (lower is better)</h2>
            <p className="mt-1 text-sm text-muted-foreground">MAE and RMSE in CGPA points.</p>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MODELS.map((m) => ({ name: m.name, MAE: m.mae, RMSE: m.rmse }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 0.25]} tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Bar dataKey="MAE" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="RMSE" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Explained variance R&sup2; (higher is better)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Proportion of CGPA variation captured by each model.
            </p>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MODELS.map((m) => ({ name: m.name, "R\u00b2": m.r2 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Bar dataKey={"R\u00b2"} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Feature weights of the deployed model</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ridge coefficients, ranked by absolute size. Level 200 GPA and Level 100 GPA dominate the
            forecast; continuous assessment scores fine-tune it.
          </p>
          <div className="mt-5 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COEF_DATA} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
                <RTooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {COEF_DATA.map((d) => (
                    <Cell
                      key={d.label}
                      fill={d.value >= 0 ? "var(--primary)" : "var(--destructive)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Results table</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">MAE</th>
                  <th className="px-4 py-3 font-semibold">RMSE</th>
                  <th className="px-4 py-3 font-semibold">R&sup2;</th>
                  <th className="px-4 py-3 font-semibold">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => (
                  <tr key={m.name} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-medium">
                      {m.name}
                      {m.deployed ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-3 w-3" /> Deployed
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">baseline</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{m.mae.toFixed(3)}</td>
                    <td className="px-4 py-3">{m.rmse.toFixed(3)}</td>
                    <td className="px-4 py-3">{m.r2.toFixed(3)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.deployed
                        ? "Predictions land within roughly \u00b10.17 CGPA of the true value and explain 84.2% of the variance, while remaining fully interpretable."
                        : "Matches the Ridge model on R\u00b2 with a marginally lower MAE, but offers no coefficient transparency for academic advising."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 space-y-4 rounded-xl border border-border bg-muted/30 p-6 leading-relaxed">
          <h2 className="text-xl font-semibold">Interpretation</h2>
          <p>
            <strong>Mean Absolute Error (MAE = {MODEL_METRICS.mae.toFixed(3)}).</strong> On average the
            system's forecast differs from a student's true final CGPA by about 0.17 of a grade point.
            Because UCC degree classification bands are 0.60 CGPA wide (for example 3.00&ndash;3.59 for
            Second Class Upper), an error of this size is comfortably inside a single band, so the
            predicted classification is dependable for guidance purposes.
          </p>
          <p>
            <strong>Root Mean Squared Error (RMSE = {MODELS[0].rmse.toFixed(3)}).</strong> RMSE penalises
            large mistakes more heavily than MAE. The two values are close (0.204 against 0.171), which
            indicates the errors are evenly spread and the model is not producing a few wildly wrong
            predictions. This residual spread is what generates the 80% confidence range shown to each
            student alongside their predicted CGPA.
          </p>
          <p>
            <strong>Coefficient of determination (R&sup2; = {MODEL_METRICS.r2.toFixed(3)}).</strong> The
            model accounts for approximately 84.2% of the variation in final CGPA across the held-out
            students; the remaining 15.8% reflects factors not captured in the dataset, such as personal
            circumstances, health, and work commitments common among distance-education learners. An
            R&sup2; above 0.80 is regarded as a strong fit for educational data mining.
          </p>
          <p>
            <strong>Choice of algorithm.</strong> Ridge Regression and Random Forest achieved an
            identical R&sup2; of 0.842, with the Random Forest only 0.005 CGPA better on MAE. Since the
            performance difference is negligible, Ridge Regression was deployed because its coefficients
            can be read directly, allowing SSPS to tell a student exactly which factor is raising or
            lowering their forecast and to attach concrete, explainable recommendations to it.
          </p>
          <p>
            <strong>Continuous learning.</strong> Students may record their actual final CGPA after
            graduation. These verified outcomes are stored securely and form the retraining set, so MAE
            and RMSE are expected to fall further as the system accumulates real UCC CoDE results.
          </p>
        </section>
      </main>
    </div>
  );
}
