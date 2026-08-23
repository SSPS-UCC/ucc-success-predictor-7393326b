import { z } from "zod";

/**
 * Shared GPA validation rules for the UCC 4.00 scale.
 * Applied to Level 100/200 (required), Level 300 (optional) and actual CGPA.
 */
export const GPA_MIN = 0;
export const GPA_MAX = 4;

export const gpaSchema = z
  .number({ message: "Enter a numeric GPA" })
  .finite("Enter a numeric GPA")
  .min(GPA_MIN, `GPA cannot be below ${GPA_MIN.toFixed(2)}`)
  .max(GPA_MAX, `GPA cannot exceed ${GPA_MAX.toFixed(2)} on the UCC scale`)
  .refine((v) => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, {
    message: "Use at most two decimal places (e.g. 3.25)",
  });

export type GpaCheck = { ok: true; value: number } | { ok: false; message: string };

/** Parse a raw form string into a validated GPA. */
export function checkGpa(label: string, raw: string, required: boolean): GpaCheck | null {
  const trimmed = raw.trim();
  if (trimmed === "") {
    if (required) return { ok: false, message: `${label} is required` };
    return null; // optional and omitted
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, message: `${label} must be a number` };
  const parsed = gpaSchema.safeParse(n);
  if (!parsed.success) return { ok: false, message: `${label}: ${parsed.error.issues[0]!.message}` };
  return { ok: true, value: parsed.data };
}

/**
 * Soft plausibility rules across levels. Returns a warning string when the
 * pattern is unusual (not an error - students can still submit).
 */
export function gpaConsistencyWarning(l1: number, l2: number, l3: number | null): string | null {
  const values = [l1, l2, ...(l3 !== null ? [l3] : [])];
  const swing = Math.max(...values) - Math.min(...values);
  if (swing > 2.5) {
    return "That is a very large swing between levels - please double-check your GPAs.";
  }
  if (values.every((v) => v === 0)) {
    return "All GPAs are 0.00 - the forecast will not be meaningful.";
  }
  return null;
}
