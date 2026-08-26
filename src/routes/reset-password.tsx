import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";

import { Crests } from "@/components/Crests";
import { EmailHelp } from "@/components/EmailHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Set a new password for your SSPS account using the secure reset link sent to your email address.",
      },
      { property: "og:title", content: "Reset your password | SSPS" },
      {
        property: "og:description",
        content: "Securely recover access to your UCC CoDE CGPA prediction account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // An expired/used recovery link comes back with an error in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      toast.error("That reset link has expired. Request a new one below.");
      window.history.replaceState(null, "", window.location.pathname);
    }
    // A valid recovery link signs the user in with a temporary recovery session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Enter your registered email address first.");
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
    toast.success("If that address is registered, a password reset link is on its way.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    const strong = passwordSchema.safeParse(password);
    if (!strong.success) {
      toast.error(strong.error.issues[0]!.message);
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("password_recovery_completed", "auth", null, { method: "self_service_reset" });
    setDone(true);
    toast.success("Password updated successfully.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Crests size={48} className="mb-8" />

        {done ? (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
              <h1 className="text-2xl">Password updated</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your new password has been set successfully. You can continue straight into the
              system, or sign in again with your new password.
            </p>
            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate({ to: "/dashboard", replace: true })}
              >
                Continue to dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
                }}
              >
                Sign in again
              </Button>
            </div>
          </>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : hasSession ? (
          <>
            <h1 className="text-2xl">Set a new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your SSPS account, then confirm it.
            </p>
            <form onSubmit={updatePassword} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrength value={password} className="pt-1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !passwordSchema.safeParse(password).success}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          </>
        ) : sent ? (
          <>
            <div className="flex items-center gap-3">
              <MailCheck className="h-7 w-7 text-primary" aria-hidden="true" />
              <h1 className="text-2xl">Check your inbox</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              If <span className="text-foreground">{email.trim()}</span> is registered, we&apos;ve
              emailed a secure reset link. Open the email on this device and click the link — it
              brings you right back here to set your new password.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              size="lg"
              disabled={loading}
              onClick={() => setSent(false)}
            >
              Use a different email / resend
            </Button>
            <EmailHelp className="mt-4" address={email.trim() || null} />
          </>
        ) : (
          <>
            <h1 className="text-2xl">Forgot your password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email address you registered with and we&apos;ll send you a secure link to
              reset your password.
            </p>
            <form onSubmit={sendResetLink} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
            <EmailHelp className="mt-4" address={email.trim() || null} />
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/auth" search={{ mode: "signin" }} className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
