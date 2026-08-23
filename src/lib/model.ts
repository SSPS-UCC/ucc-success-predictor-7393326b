/**
 * UCC-CoDE CGPA Predictor - inference layer.
 *
 * The model is a regularised linear regression (RidgeCV, alpha selected by
 * cross-validation) trained in Python (scikit-learn 1.8) on 700 CoDE student
 * records. Held-out performance: R2 = 0.842, MAE = 0.171 GPA points,
 * residual sigma = 0.204 (a Random Forest scored R2 = 0.842 / MAE = 0.166 on
 * the same split, so the interpretable linear model was selected).
 *
 * Only the fitted coefficients + training means are shipped to the runtime,
 * so predictions are instant and work offline.
 */

export const MODEL_VERSION = "ridge-v1";

export const MODEL_METRICS = {
  r2: 0.842,
  mae: 0.171,
  sigma: 0.2035,
  trainingRows: 700,
  algorithm: "Ridge Regression (cross-validated)",
} as const;

export type FeatureKey =
  | "level100_gpa"
  | "level200_gpa"
  | "course_credits"
  | "attendance_pct"
  | "study_hours_per_week"
  | "participation_score"
  | "quiz1_score"
  | "quiz2_score"
  | "assignment_score"
  | "presentation_score"
  | "practical_score";

const INTERCEPT = -0.596213;

export const COEF: Record<FeatureKey, number> = {
  level100_gpa: 0.235338,
  level200_gpa: 0.31451,
  course_credits: -0.000982,
  attendance_pct: 0.002479,
  study_hours_per_week: 0.011325,
  participation_score: 0.003201,
  quiz1_score: 0.005474,
  quiz2_score: 0.003358,
  assignment_score: 0.003177,
  presentation_score: 0.003462,
  practical_score: 0.002612,
};

/** Training-set means: used to impute any optional field a student leaves blank. */
export const MEANS: Record<FeatureKey, number> = {
  level100_gpa: 2.813,
  level200_gpa: 2.8541,
  course_credits: 16.1985,
  attendance_pct: 74.4212,
  study_hours_per_week: 4.2323,
  participation_score: 70.2339,
  quiz1_score: 69.9505,
  quiz2_score: 69.6796,
  assignment_score: 70.4666,
  presentation_score: 71.3569,
  practical_score: 70.2491,
};

export type Inputs = Partial<Record<FeatureKey, number | null | undefined>> & {
  level100_gpa: number;
  level200_gpa: number;
  /**
   * Optional Level 300 GPA. The Ridge model was trained on Level 100/200 records
   * only, so this is applied as a documented recency correction rather than a
   * fitted coefficient (see LEVEL300_WEIGHT below).
   */
  level300_gpa?: number | null;
};

/**
 * Weight given to the Level 300 GPA when a student chooses to supply it.
 * The correction shifts the Ridge estimate toward the most recent year of
 * performance, which is the closest proxy for the final year, and the
 * prediction interval is narrowed because one more year of evidence is known.
 */
export const LEVEL300_WEIGHT = 0.35;
const LEVEL300_SIGMA_FACTOR = 0.82;

/** UCC / KNUST / Legon degree classification bands on the 4.00 CGPA scale. */
export const CLASS_BANDS = [
  { name: "First Class", min: 3.6, max: 4.0 },
  { name: "Second Class (Upper Division)", min: 3.0, max: 3.59 },
  { name: "Second Class (Lower Division)", min: 2.0, max: 2.99 },
  { name: "Third Class", min: 1.5, max: 1.99 },
  { name: "Pass", min: 1.0, max: 1.49 },
  { name: "Fail", min: 0, max: 0.99 },
] as const;

export function classify(gpa: number): string {
  return (CLASS_BANDS.find((b) => gpa >= b.min) ?? CLASS_BANDS[CLASS_BANDS.length - 1]!).name;
}

export function nextClassUp(gpa: number): { name: string; min: number } | null {
  const higher = [...CLASS_BANDS].reverse().find((b) => b.min > gpa);
  return higher ? { name: higher.name, min: higher.min } : null;
}

export type PredictionResult = {
  gpa: number;
  classification: string;
  passFail: "Pass" | "Fail";
  low: number;
  high: number;
  /** Per-feature contribution to the prediction, biggest lever first. */
  drivers: {
    key: FeatureKey | "level300_gpa";
    label: string;
    contribution: number;
    provided: boolean;
  }[];
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  level100_gpa: "Level 100 GPA",
  level200_gpa: "Level 200 GPA",
  course_credits: "Course credits",
  attendance_pct: "Attendance %",
  study_hours_per_week: "Study hours / week",
  participation_score: "Participation",
  quiz1_score: "Quiz 1",
  quiz2_score: "Quiz 2",
  assignment_score: "Assignment",
  presentation_score: "Presentation",
  practical_score: "Practical / Lab",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function predict(inputs: Inputs): PredictionResult {
  let gpa = INTERCEPT;
  const drivers: PredictionResult["drivers"] = [];

  (Object.keys(COEF) as FeatureKey[]).forEach((key) => {
    const raw = inputs[key];
    const provided = raw !== undefined && raw !== null && !Number.isNaN(raw);
    const value = provided ? Number(raw) : MEANS[key];
    const term = COEF[key] * value;
    gpa += term;
    drivers.push({
      key,
      label: FEATURE_LABELS[key],
      // contribution relative to an "average student" on that feature
      contribution: COEF[key] * (value - MEANS[key]),
      provided,
    });
  });

  const l3 = inputs.level300_gpa;
  const hasL3 = l3 !== undefined && l3 !== null && !Number.isNaN(Number(l3));
  let sigma = MODEL_METRICS.sigma;

  if (hasL3) {
    const before = gpa;
    // Recency correction: pull the estimate toward the most recent year on record.
    gpa = (1 - LEVEL300_WEIGHT) * gpa + LEVEL300_WEIGHT * Number(l3);
    sigma = MODEL_METRICS.sigma * LEVEL300_SIGMA_FACTOR;
    drivers.push({
      key: "level300_gpa",
      label: "Level 300 GPA",
      contribution: gpa - before,
      provided: true,
    });
  }

  gpa = clamp(gpa, 0, 4);
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    gpa,
    classification: classify(gpa),
    passFail: gpa >= 1 ? "Pass" : "Fail",
    // ~80% prediction interval from the held-out residual sigma
    low: clamp(gpa - 1.282 * sigma, 0, 4),
    high: clamp(gpa + 1.282 * sigma, 0, 4),
    drivers,
  };
}

/** UCC grading scale (4.00 point system). */
export const GRADE_SCALE = [
  { grade: "A", range: "80 - 100", point: 4.0 },
  { grade: "B+", range: "75 - 79", point: 3.5 },
  { grade: "B", range: "70 - 74", point: 3.0 },
  { grade: "C+", range: "65 - 69", point: 2.5 },
  { grade: "C", range: "60 - 64", point: 2.0 },
  { grade: "D+", range: "55 - 59", point: 1.5 },
  { grade: "D", range: "50 - 54", point: 1.0 },
  { grade: "E", range: "45 - 49", point: 0.5 },
  { grade: "F", range: "0 - 44", point: 0.0 },
];
