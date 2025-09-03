import React from 'react';
import { ProfilePage } from '@/components/ProfilePage';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [currentPage, setCurrentPage] = React.useState('profile');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  return <ProfilePage onNavigate={handleNavigate} />;
};

export default App;