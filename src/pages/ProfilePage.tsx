import React from 'react';
import { ProfilePage as ProfileComponent } from '../components/ProfilePage';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const handleNavigate = (page: string) => {
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
        navigate('/camera');
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

  return <ProfileComponent onNavigate={handleNavigate} />;
}