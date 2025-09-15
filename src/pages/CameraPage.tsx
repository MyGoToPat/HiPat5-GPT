import React from 'react';
import { TalkingPatPage2 } from '../components/TalkingPatPage2';
import { useLocation } from 'react-router-dom';

export default function CameraPage() {
  const location = useLocation();
  

  // Get initial state from navigation
  const initialState = location.state;

  return <TalkingPatPage2 initialState={initialState} />;
}