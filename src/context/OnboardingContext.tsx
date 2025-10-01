import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { calculateTDEEAndMacros } from '../utils/tdeeCalculator';

// Define the shape of the user data
interface UserData {
  firstName?: string; // User's first name - to be persisted to user profile in database when backend support is enabled
  gender?: 'male' | 'female';
  age?: number;
  dateOfBirth?: string;
  height?: { value: number; unit: 'cm' }; // Always store in cm
  weight?: { value: number; unit: 'kg' }; // Always store in kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very';
  bodyFatPercent?: number;
  dietaryPreference?: 'carnivore_keto' | 'ketovore' | 'low_carb' | 'balanced_omnivore';
}

// Define the shape of the calculated macros
interface CalculatedMacros {
  mifflinBmr?: number;
  katchBmr?: number;
  chosenBmr?: number;
  formulaUsed?: 'mifflin' | 'katch' | 'average';
  tdee?: number;
  proteinG?: number;
  proteinCal?: number;
  fatG?: number;
  fatCal?: number;
  carbG?: number;
  carbCal?: number;
  tefCal?: number;
  netCal?: number;
}

// Define the shape of the context value
interface OnboardingContextType {
  currentStep: number;
  userData: UserData;
  calculatedMacros: CalculatedMacros;
  stepValidity: Map<number, boolean>;
  updateUserData: (key: keyof UserData, value: any) => void;
  setStepValidity: (step: number, isValid: boolean) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  calculateMacros: () => void;
  saveLead: (name: string, email: string) => void; // Placeholder for Phase 3
  saveToProfile: () => void; // Placeholder for Phase 3
  isLoggedIn: boolean; // Placeholder for Phase 3
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [userData, setUserData] = useState<UserData>({});
  const [calculatedMacros, setCalculatedMacros] = useState<CalculatedMacros>({});
  const [stepValidity, setStepValidityState] = useState<Map<number, boolean>>(new Map());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Check authentication status and load user profile on mount
  React.useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        const { getSupabase, getUserProfile } = await import('../lib/supabase');
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsLoggedIn(true);

          // Load user profile to pre-populate name
          const profile = await getUserProfile(user.id);
          if (profile?.name) {
            setUserData(prev => ({ ...prev, firstName: profile.name }));
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Failed to check auth status or load profile:', error);
        setIsLoggedIn(false);
      }
    };
    checkAuthAndLoadProfile();
  }, []);

  const updateUserData = useCallback((key: keyof UserData, value: any) => {
    setUserData(prevData => {
      let processedValue = value;
      // Handle unit conversions for height and weight to store in metric
      if (key === 'height' && value?.unit === 'in') {
        processedValue = { value: value.value * 2.54, unit: 'cm' };
      } else if (key === 'weight' && value?.unit === 'lbs') {
        processedValue = { value: value.value * 0.453592, unit: 'kg' };
      }
      return { ...prevData, [key]: processedValue };
    });
  }, []);

  const setStepValidity = useCallback((step: number, isValid: boolean) => {
    setStepValidityState(prevMap => {
      const newMap = new Map(prevMap);
      newMap.set(step, isValid);
      return newMap;
    });
  }, []);

  const goToNextStep = useCallback(() => {
    setCurrentStep(prevStep => prevStep + 1);
  }, []);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prevStep => Math.max(0, prevStep - 1));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const calculateMacros = useCallback(() => {
    try {
      const macros = calculateTDEEAndMacros(userData);
      setCalculatedMacros(macros);
    } catch (error) {
      console.error('Failed to calculate macros:', error);
      setCalculatedMacros({});
    }
  }, [userData]);

  // Auto-calculate macros when userData changes (after step 5)
  React.useEffect(() => {
    if (currentStep >= 9 && userData.gender && userData.age && userData.height && userData.weight && userData.activityLevel) {
      calculateMacros();
    }
  }, [userData, currentStep, calculateMacros]);

  // Placeholder functions for future phases
  const saveLead = useCallback((name: string, email: string) => {
    console.log('Saving lead:', name, email);
    // Logic for Phase 3
  }, []);

  const saveToProfile = useCallback(() => {
    console.log('Saving to profile...');
    // Logic for Phase 3
  }, []);

  const value = {
    currentStep,
    userData,
    calculatedMacros,
    stepValidity,
    updateUserData,
    setStepValidity,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    calculateMacros,
    saveLead,
    saveToProfile,
    isLoggedIn,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};