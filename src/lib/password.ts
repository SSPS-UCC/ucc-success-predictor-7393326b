import { z } from "zod";

/** Shared password policy for SSPS accounts (sign-up, reset, admin change). */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one symbol (e.g. ! ? # @)")
  .refine((v) => !/(.)\1{2,}/.test(v), "Avoid repeating the same character 3+ times")
  .refine(
    (v) => !COMMON_PATTERNS.some((p) => v.toLowerCase().includes(p)),
    "Avoid common words like \"password\", \"ucc\" or \"12345\"",
  );

const COMMON_PATTERNS = [
  "password",
  "passw0rd",
  "12345",
  "qwerty",
  "letmein",
  "admin",
  "ucc",
  "ssps",
  "student",
];

export type PasswordRule = { label: string; passed: boolean };

export function passwordRules(value: string): PasswordRule[] {
  return [
    { label: "At least 10 characters", passed: value.length >= 10 },
    { label: "Upper and lowercase letters", passed: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { label: "At least one number", passed: /[0-9]/.test(value) },
    { label: "At least one symbol", passed: /[^A-Za-z0-9]/.test(value) },
    {
      label: "No common words or repeated runs",
      passed:
        value.length > 0 &&
        !/(.)\1{2,}/.test(value) &&
        !COMMON_PATTERNS.some((p) => value.toLowerCase().includes(p)),
    },
  ];
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** True when the password satisfies the enforced policy. */
  valid: boolean;
  /** First unmet policy message, if any. */
  message: string | null;
};

export function scorePassword(value: string): PasswordStrength {
  const parsed = passwordSchema.safeParse(value);
  const rules = passwordRules(value);
  const passed = rules.filter((r) => r.passed).length;
  let score = Math.max(0, passed - 1) as 0 | 1 | 2 | 3 | 4;
  if (parsed.success && value.length >= 14) score = 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;
  return {
    score,
    label: value ? labels[score]! : "Enter a password",
    valid: parsed.success,
    message: parsed.success ? null : (parsed.error.issues[0]?.message ?? "Password is too weak"),
  };
}
