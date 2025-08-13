import React from 'react';
import TDEEOnboardingWizard from './TDEEOnboardingWizard';
import { useNavigate } from 'react-router-dom';

export default function TDEEWizard() {
  const navigate = useNavigate();
  
  const handleComplete = () => {
    navigate('/dashboard');
  };

  return <TDEEOnboardingWizard onComplete={handleComplete} />;
}