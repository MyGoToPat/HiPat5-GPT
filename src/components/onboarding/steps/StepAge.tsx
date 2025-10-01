import React, { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { DateOfBirthCarousel } from '../DateOfBirthCarousel';

export const StepAge: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();
  
  // Initialize with default date July 1, 1999 or existing data
  const getInitialDate = () => {
    if (userData.dateOfBirth) {
      // Parse ISO date string directly to avoid timezone issues
      // Format is "YYYY-MM-DD"
      const [year, month, day] = userData.dateOfBirth.split('-').map(Number);
      return {
        month: month,
        day: day,
        year: year
      };
    }
    return { month: 7, day: 1, year: 1999 }; // Default to July 1, 1999
  };

  const [dateOfBirth, setDateOfBirth] = useState(getInitialDate());

  const validateAge = (birthDate: { month: number; day: number; year: number }): boolean => {
    const today = new Date();
    const birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
      ? age - 1 
      : age;
    
    return actualAge >= 18; // Changed to 18 years minimum
  };

  const calculateAge = (birthDate: { month: number; day: number; year: number }): number => {
    const today = new Date();
    const birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
      ? age - 1 
      : age;
  };

  const handleDateChange = (newDate: { month: number; day: number; year: number }) => {
    setDateOfBirth(newDate);
    
    const isValid = validateAge(newDate);
    const age = calculateAge(newDate);
    
    // Convert to ISO date string for storage
    const isoDate = `${newDate.year}-${newDate.month.toString().padStart(2, '0')}-${newDate.day.toString().padStart(2, '0')}`;
    
    // Update both dateOfBirth and age in userData
    updateUserData('dateOfBirth', isoDate);
    updateUserData('age', isValid ? age : undefined);
    setStepValidity(currentStep, isValid);
  };

  // Initialize context data once on mount if no data exists
  React.useEffect(() => {
    // Only initialize if no existing data
    if (!userData.dateOfBirth) {
      const isValid = validateAge(dateOfBirth);
      const age = calculateAge(dateOfBirth);
      
      const isoDate = `${dateOfBirth.year}-${dateOfBirth.month.toString().padStart(2, '0')}-${dateOfBirth.day.toString().padStart(2, '0')}`;
      updateUserData('dateOfBirth', isoDate);
      updateUserData('age', isValid ? age : undefined);
      setStepValidity(currentStep, isValid);
    } else {
      // Set validity based on existing data
      const isValid = validateAge(dateOfBirth);
      setStepValidity(currentStep, isValid);
    }
  }, []); // Empty dependency array - only run once on mount

  const currentAge = calculateAge(dateOfBirth);
  const isValid = validateAge(dateOfBirth);

  return (
    <div className="text-center px-4">
      <div className="space-y-6">
        <DateOfBirthCarousel
          value={dateOfBirth}
          onChange={handleDateChange}
        />
        
        {isValid && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-xs mx-auto">
            <div className="text-3xl font-bold text-blue-900 mb-1">{currentAge}</div>
            <div className="text-sm text-blue-700">years old</div>
          </div>
        )}
      </div>
      
      {!isValid && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg max-w-xs mx-auto">
          <p className="text-red-600 text-sm">
            You must be at least 18 years old to use this service.
          </p>
        </div>
      )}
      
    </div>
  );
};