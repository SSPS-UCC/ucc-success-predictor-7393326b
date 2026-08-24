import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Crests } from "@/components/Crests";
import { EmailHelp } from "@/components/EmailHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/PasswordStrength";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password";

const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | SSPS | UCC Students Success Prediction System" },
      {
        name: "description",
        content:
          "Recover your SSPS account: verify the code sent to your email and create a new password to sign back in.",
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
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // An expired/used recovery link comes back with an error in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("error")) {
      toast.error("That recovery link has expired. Request a new one below.");
      window.history.replaceState(null, "", window.location.pathname);
    }
    // A recovery link signs the user in with a temporary recovery session.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
  }, []);

  async function resendRecovery() {
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
    toast.success("If that address is registered, a fresh recovery email is on the way.");
  }


  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (attempts >= MAX_ATTEMPTS) {
      toast.error("Too many attempts. Request a fresh recovery code.");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error("Enter the 6-digit verification code exactly as emailed.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      setAttempts((a) => a + 1);
      toast.error("That code is invalid or has expired. Request a new one.");
      return;
    }
    setAttempts(0);
    setHasSession(true);
    void logAudit("password_recovery_verified", "auth", null, { method: "email_otp" });
    toast.success("Verified — now choose a new password.");
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
    toast.success("Password updated. Please sign in with your new password.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Crests size={48} className="mb-8" />
        <h1 className="text-2xl">Reset your password</h1>

        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking your recovery link…</p>
        ) : hasSession ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your SSPS account.
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
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email address you registered with and the 6-digit verification code we
              emailed you. If you opened the link from your email on this device, this step is
              skipped automatically.
            </p>
            <form onSubmit={verifyCode} className="mt-6 space-y-4">
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
              <div className="space-y-1.5">
                <Label htmlFor="reset-code">Verification code</Label>
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify code
              </Button>
              <button
                type="button"
                onClick={resendRecovery}
                disabled={loading}
                className="w-full text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Didn&apos;t get it? Send a new recovery email
              </button>
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
