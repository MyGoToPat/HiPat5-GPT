import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfilePage as ProfileComponent } from '../components/ProfilePage';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const onNavigate = (page: string) => {
    if (page === 'chat') return navigate('/chat');
    if (page === 'dashboard') return navigate('/dashboard');
    if (page === 'tdee') return navigate('/tdee');
  };

  return <ProfileComponent onNavigate={onNavigate} />;
};

export default ProfilePage;