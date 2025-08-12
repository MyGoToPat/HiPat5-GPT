import { getBmr } from '../src/lib/bmr';

test('lean male triggers Katch', () => {
  const r = getBmr({ 
    weightKg: 90, 
    heightCm: 175, 
    age: 30,
    sex: 'male', 
    bodyFatPct: 12 
  });
  expect(r.formulaUsed).toBe('katch');
  expect(r.chosenBmr).toBeGreaterThan(r.mifflin);
});