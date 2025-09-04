import React from 'react';
import { TalkingPatPage1 } from '../components/TalkingPatPage1';
import { useNavigate } from 'react-router-dom';

interface VoicePageProps {}

export default function VoicePage() {
  const navigate = useNavigate();
  
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

  return <TalkingPatPage1 onNavigate={handleNavigate} />;
}