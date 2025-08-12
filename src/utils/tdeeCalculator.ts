import { getBmr, Sex } from '../lib/bmr';

interface UserData {
  gender?: Sex;
  age?: number;
  height?: { value: number; unit: 'cm' }; // Always in cm
  weight?: { value: number; unit: 'kg' }; // Always in kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very' | 'super';
  bodyFatPercent?: number;
  dietaryPreference?: 'carnivore_keto' | 'ketovore' | 'low_carb' | 'balanced_omnivore';
}

interface CalculatedMacros {
  mifflinBmr: number;
  katchBmr?: number;
  chosenBmr: number;
  formulaUsed: 'mifflin' | 'katch' | 'average';
  tdee: number;
  proteinG: number;
  proteinCal: number;
  fatG: number;
  fatCal: number;
  carbG: number;
  carbCal: number;
  tefCal: number;
  netCal: number;
}

export function calculateTDEEAndMacros(userData: UserData): CalculatedMacros {
  const { gender, age, height, weight, activityLevel, bodyFatPercent, dietaryPreference } = userData;

  // Validate required inputs
  if (!gender || !age || !height || !weight || !activityLevel) {
    throw new Error('Missing required user data for calculation');
  }

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    super: 1.9
  };

  // Protein multipliers (g per lb of body weight or LBM)
  const proteinMultipliers = {
    sedentary: 0.8,
    light: 0.9,
    moderate: 1.0,
    very: 1.2
  };

  // Fat percentage ranges by dietary preference
  const fatPercentages = {
    carnivore_keto: 0.75, // 75% (midpoint of 70-80%)
    ketovore: 0.65, // 65% (midpoint of 60-70%)
    low_carb: 0.35, // 35% (midpoint of 30-40%)
    balanced_omnivore: 0.275 // 27.5% (midpoint of 25-30%)
  };

  // Convert weight to lbs for some calculations
  const weightLbs = weight.value * 2.20462;
  const heightCm = height.value;

  // Calculate BMR using the new helper
  const bmrResult = getBmr({
    weightKg: weight.value,
    heightCm: heightCm,
    age: age,
    sex: gender,
    bodyFatPct: bodyFatPercent
  });

  // Calculate TDEE
  const tdee = bmrResult.chosenBmr * activityMultipliers[activityLevel];

  // Calculate Protein
  const proteinMultiplier = proteinMultipliers[activityLevel];
  let proteinG: number;
  
  if (bodyFatPercent && bodyFatPercent > 0) {
    // Base protein on lean body mass if body fat is known
    const leanBodyMassLbs = weightLbs * (1 - bodyFatPercent / 100);
    proteinG = leanBodyMassLbs * proteinMultiplier;
  } else {
    // Base protein on total body weight
    proteinG = weightLbs * proteinMultiplier;
  }
  
  const proteinCal = proteinG * 4;

  // Calculate Fat
  const fatPercentage = fatPercentages[dietaryPreference || 'balanced_omnivore'];
  const fatCal = tdee * fatPercentage;
  const fatG = fatCal / 9;

  // Calculate Carbs (remaining calories)
  const carbCal = tdee - (proteinCal + fatCal);
  const carbG = Math.max(0, carbCal / 4); // Ensure carbs don't go negative

  // Calculate TEF (Thermic Effect of Food)
  const tefCal = (0.25 * proteinCal) + (0.11 * carbCal) + (0.03 * fatCal);
  const netCal = tdee - tefCal;

  return {
    mifflinBmr: bmrResult.mifflin,
    katchBmr: bmrResult.katch,
    chosenBmr: bmrResult.chosenBmr,
    formulaUsed: bmrResult.formulaUsed,
    tdee: Math.round(tdee),
    proteinG: Math.round(proteinG),
    proteinCal: Math.round(proteinCal),
    fatG: Math.round(fatG),
    fatCal: Math.round(fatCal),
    carbG: Math.round(carbG),
    carbCal: Math.round(carbCal),
    tefCal: Math.round(tefCal),
    netCal: Math.round(netCal)
  };
}