import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, LineChart, ArrowRight, Target } from "lucide-react";

import heroImage from "@/assets/ucc-graduation.jpg.asset.json";
import { Crests } from "@/components/Crests";
import { Button } from "@/components/ui/button";
import { MODEL_METRICS, CLASS_BANDS } from "@/lib/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "SSPS, the UCC Students Success Prediction System, forecasts your final CGPA and degree class for College of Distance Education and non-residential students.",
      },
      { property: "og:title", content: "SSPS | UCC Students Success Prediction System" },
      {
        property: "og:description",
        content:
          "Predict your final CGPA and degree classification on the UCC 4.00 scale, with dynamic study recommendations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <Crests size={44} className="rounded-md bg-background/90 px-3 py-1.5 backdrop-blur" />
            <span className="hidden text-sm font-semibold text-primary-foreground sm:block">
              UCC &middot; College of Distance Education
            </span>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="University of Cape Coast graduates celebrating in gowns and mortarboard caps"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-40 sm:pt-48">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-primary/40 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Machine learning &middot; CGPA 4.00 scale
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight text-primary-foreground sm:text-6xl">
            Know your final CGPA before final year does.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
            A predictive academic guidance system built for non-residential students of the
            University of Cape Coast, College of Distance Education. Enter your Level 100 and Level
            200 GPAs and the model forecasts your final CGPA, your degree classification, and the
            exact areas to sit up in.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Create your account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ mode: "signin" }}>
                I already have an account
              </Link>
            </Button>
          </div>

          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Model accuracy (R\u00b2)", v: MODEL_METRICS.r2.toFixed(3) },
              { k: "Average error", v: `\u00b1${MODEL_METRICS.mae.toFixed(2)} GPA` },
              { k: "Training records", v: MODEL_METRICS.trainingRows.toLocaleString() },
              { k: "Grading scale", v: "4.00 CGPA" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-primary-foreground/15 bg-primary/30 p-4 backdrop-blur"
              >
                <dt className="text-[11px] uppercase tracking-wider text-primary-foreground/70">
                  {s.k}
                </dt>
                <dd className="mt-1 font-display text-xl text-gold">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-2xl sm:text-3xl">Built for the way CoDE actually assesses you</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every course is 40% continuous assessment and 60% examination. The system reads both, and
          weights everything by credit hours, exactly like the University computes CGPA.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: LineChart,
              title: "Regression-based forecast",
              body: "A cross-validated ridge regression trained on 700 student records returns your predicted final CGPA with an 80% confidence range, not a vague guess.",
            },
            {
              icon: Target,
              title: "Dynamic recommendations",
              body: "The system names your weakest quiz, assignment or presentation, computes the examination mark you now need, and shows the gap to the next degree class.",
            },
            {
              icon: ShieldCheck,
              title: "Private and secure by design",
              body: "Registration by email or phone with Google sign-in supported. Row-level security means no student can ever read another student's academic record.",
            },
          ].map((f) => (
            <article key={f.title} className="panel p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-lg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl">Degree classification bands (UCC 4.00 scale)</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLASS_BANDS.map((b) => (
              <div key={b.name} className="panel flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium">{b.name}</span>
                <span className="font-display text-sm text-accent-foreground">
                  {b.min.toFixed(2)} &ndash; {b.max.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Crests size={48} />
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            <GraduationCap className="mr-1 inline h-3.5 w-3.5" />
            Final year project &mdash; predictive CGPA guidance system for University of Cape Coast,
            College of Distance Education. Predictions are guidance, not an official University
            result.
          </p>
        </div>
      </footer>
    </div>
  );
}
