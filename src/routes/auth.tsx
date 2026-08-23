import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Crests } from "@/components/Crests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in or register | SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Register or sign in to the UCC College of Distance Education CGPA prediction system with your email, phone number or Google account.",
      },
      { property: "og:title", content: "Sign in | SSPS | UCC Students Success Prediction System" },
      {
        property: "og:description",
        content: "Secure student access to the UCC CoDE CGPA prediction system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{9,20}$/, "Enter a valid telephone number"),
  studentId: z.string().trim().max(30).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

const RECOVERY_THROTTLE_KEY = "ssps.recovery.lastRequest";
const RECOVERY_COOLDOWN_MS = 60_000;

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signup");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    studentId: "",
    password: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data.session) {
      await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          student_id: parsed.data.studentId || null,
        })
        .eq("id", data.session.user.id);
      toast.success("Welcome aboard");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Check your email to confirm your account, then sign in.");
      setTab("signin");
    }
    setLoading(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!z.string().email().max(255).safeParse(email).success) {
      toast.error("Enter the email address you registered with.");
      return;
    }
    // Client-side throttle: one recovery message per 60 seconds per device.
    const last = Number(localStorage.getItem(RECOVERY_THROTTLE_KEY) ?? 0);
    const waitMs = RECOVERY_COOLDOWN_MS - (Date.now() - last);
    if (waitMs > 0) {
      toast.error(`Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    localStorage.setItem(RECOVERY_THROTTLE_KEY, String(Date.now()));
    setCooldown(RECOVERY_COOLDOWN_MS / 1000);
    if (error && /rate|too many/i.test(error.message)) {
      toast.error("Too many recovery requests. Please try again later.");
      return;
    }
    // Never reveal whether an account exists for this address.
    toast.success(
      "If that address is registered, a recovery link and verification code are on the way.",
    );
    navigate({ to: "/reset-password" });
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-overlay relative hidden flex-col justify-between p-12 lg:flex">
        <Crests
          size={64}
          className="w-fit self-start rounded-xl border border-gold/50 bg-primary-foreground/95 px-5 py-3 shadow-[0_12px_34px_-16px_oklch(0.2_0.05_259/0.75)]"
        />
        <div>
          <h1 className="max-w-md text-4xl leading-tight text-primary-foreground">
            Your academic journey, forecast with evidence.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            University of Cape Coast &middot; College of Distance Education. Built for
            non-residential students on the 4.00 CGPA scale.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Veritas Nobis Lumen &middot; Knowledge for All</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Crests size={48} className="mb-8 lg:hidden" />
          <div className="mb-6 flex rounded-lg border border-border bg-secondary p-1">
            {(["signup", "signin"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "signup" ? "Register" : "Sign in"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl">
            {forgot
              ? "Recover your account"
              : tab === "signup"
                ? "Create your student account"
                : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {forgot
              ? "Enter your registered email address. We'll send you a recovery link and a verification code so you can create a new password."
              : tab === "signup"
                ? "Register with your email and telephone number, or continue with Google."
                : "Sign in to run a new prediction and view your history."}
          </p>

          <form
            onSubmit={forgot ? handleForgotPassword : tab === "signup" ? handleSignUp : handleSignIn}
            className="mt-6 space-y-4"
          >
            {!forgot && tab === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={form.fullName} onChange={set("fullName")} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telephone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="024 000 0000"
                      value={form.phone}
                      onChange={set("phone")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="studentId">Student ID (optional)</Label>
                    <Input id="studentId" value={form.studentId} onChange={set("studentId")} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>
            {!forgot && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {tab === "signin" && (
                    <button
                      type="button"
                      onClick={() => setForgot(true)}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={set("password")}
                  required
                />
                {tab === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters, including a letter and a number.
                  </p>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {forgot ? "Send recovery code" : tab === "signup" ? "Create account" : "Sign in"}
            </Button>
            {forgot && (
              <div className="space-y-2 text-center">
                <button
                  type="button"
                  onClick={() => setForgot(false)}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Back to sign in
                </button>
                <p className="text-xs text-muted-foreground">
                  Already have a code?{" "}
                  <Link to="/reset-password" className="underline underline-offset-4">
                    Enter it here
                  </Link>
                </p>
              </div>
            )}
          </form>


          {!forgot && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continue with Google
              </Button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
