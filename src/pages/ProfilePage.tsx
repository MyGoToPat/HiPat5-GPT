import React from 'react';
import { ProfilePage as ProfileComponent } from '../components/ProfilePage';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const navigate = useNavigate();

  return (
    <ProfileComponent
      onNavigate={(page: string) => {
        switch (page) {
          case 'chat':
            navigate('/chat');
            break;
          case 'dashboard':
            navigate('/dashboard');
            break;
          case 'tdee':
            navigate('/tdee');
            break;
          case 'trainer-dashboard':
            navigate('/trainer-dashboard');
            break;
          default:
            // fallback to dashboard
            navigate('/dashboard');
        }
      }}
    />
  );
}