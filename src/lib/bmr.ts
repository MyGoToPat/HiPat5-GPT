export const MALE_KATCH_CUTOFF = 15;
export const FEMALE_KATCH_CUTOFF = 22;
export const MALE_MIFFLIN_CUTOFF = 25;
export const FEMALE_MIFFLIN_CUTOFF = 35;

export type Sex = 'male' | 'female';

export type BmrFormula = 'mifflin' | 'katch' | 'average';

/**
 * Determines which BMR formula to use based on sex and body fat percentage.
 * @param sex The biological sex ('male' or 'female').
 * @param bodyFatPct The body fat percentage (optional).
 * @returns The recommended BMR formula ('mifflin', 'katch', or 'average').
 */
export function pickFormula(sex: Sex, bodyFatPct: number | undefined): BmrFormula {
  if (bodyFatPct === undefined) {
    return 'mifflin';
  }

  // Clamp body fat percentage to reasonable range (3-60%)
  const bf = Math.max(3, Math.min(bodyFatPct, 60));

  // Katch-McArdle conditions
  if ((sex === 'male' && bf <= MALE_KATCH_CUTOFF) || (sex === 'female' && bf <= FEMALE_KATCH_CUTOFF)) {
    return 'katch';
  }

  // Mifflin-St Jeor conditions
  if ((sex === 'male' && bf >= MALE_MIFFLIN_CUTOFF) || (sex === 'female' && bf >= FEMALE_MIFFLIN_CUTOFF)) {
    return 'mifflin';
  }

  // Otherwise, return average
  return 'average';
}

export interface GetBmrParams {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  bodyFatPct?: number;
}

export interface GetBmrResult {
  mifflin: number;
  katch?: number;
  chosenBmr: number;
  formulaUsed: 'mifflin' | 'katch' | 'average';
}

/**
 * Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor and Katch-McArdle formulas,
 * and selects a chosen BMR based on a rule-based system.
 * @param params The parameters for BMR calculation (weight, height, age, sex, body fat percentage).
 * @returns An object containing Mifflin BMR, Katch BMR (if calculated), and the chosen BMR.
 */
export function getBmr({ weightKg, heightCm, age, sex, bodyFatPct }: GetBmrParams): GetBmrResult {
  // Clamp body fat percentage to reasonable range (3-60%)
  const clampedBodyFatPct = bodyFatPct !== undefined ? Math.max(3, Math.min(bodyFatPct, 60)) : undefined;

  // Mifflin-St Jeor Formula
  let mifflinBmr: number;
  if (sex === 'male') {
    mifflinBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    mifflinBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }

  // Katch-McArdle Formula
  let katchBmr: number | undefined;
  if (clampedBodyFatPct !== undefined) {
    const leanBodyMass = weightKg * (1 - (clampedBodyFatPct / 100));
    katchBmr = 370 + (21.6 * leanBodyMass);
  }

  const formulaToUse = pickFormula(sex, clampedBodyFatPct);

  let chosenBmr: number;
  if (formulaToUse === 'mifflin') {
    chosenBmr = mifflinBmr;
  } else if (formulaToUse === 'katch') {
    // If katch is chosen but bodyFatPct was undefined, fallback to mifflin
    chosenBmr = katchBmr !== undefined ? katchBmr : mifflinBmr;
  } else { // 'average'
    // If average is chosen but katchBmr is not available, fallback to mifflin
    chosenBmr = katchBmr !== undefined ? (mifflinBmr + katchBmr) / 2 : mifflinBmr;
  }

  return {
    mifflin: Math.round(mifflinBmr),
    katch: katchBmr !== undefined ? Math.round(katchBmr) : undefined,
    chosenBmr: Math.round(chosenBmr),
    formulaUsed: formulaToUse,
  };
}