import React from 'react';
import { IntervalTimerPage as IntervalTimerComponent } from '../components/timer/IntervalTimerPage';
import { useNavigate } from 'react-router-dom';

export default function IntervalTimerPage() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/dashboard');
  };

  return <IntervalTimerComponent onBack={handleBack} />;
}