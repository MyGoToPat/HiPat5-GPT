// (Sept-4 snapshot) src/pages/ProfilePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfilePage as ProfileComponent } from '../components/ProfilePage';

export default function ProfilePage() {
  const navigate = useNavigate();
  return (
    <ProfileComponent
      onNavigate={(page: string) => {
        if (page === 'chat') return navigate('/chat');
        if (page === 'dashboard') return navigate('/dashboard');
        if (page === 'tdee') return navigate('/tdee');
        if (page === 'trainer-dashboard') return navigate('/trainer-dashboard');
        return navigate('/dashboard');
      }}
    />
  );
}