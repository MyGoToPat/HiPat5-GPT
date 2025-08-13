import React from 'react';
import { TalkingPatPage2 } from '../components/TalkingPatPage2';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CameraPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigate = (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
    switch (page) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'voice':
        navigate('/voice');
        break;
      case 'camera':
        navigate('/camera', { state });
        break;
      case 'tdee-wizard':
        navigate('/tdee');
        break;
      case 'interval-timer':
        navigate('/interval-timer');
        break;
      case 'trainer-dashboard':
        navigate('/trainer-dashboard');
        break;
      case 'debug':
        navigate('/debug');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/dashboard');
    }
  };

  // Get initial state from navigation
  const initialState = location.state;

  return <TalkingPatPage2 onNavigate={handleNavigate} initialState={initialState} />;
}