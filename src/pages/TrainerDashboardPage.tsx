import React from 'react';
import { TrainerDashboardPage as TrainerDashboardComponent } from '../components/TrainerDashboardPage';
import { UserProfile } from '../types/user';

interface TrainerDashboardPageProps {
  userProfile: UserProfile | null;
}

export default function TrainerDashboardPage({ userProfile }: TrainerDashboardPageProps) {

  return <TrainerDashboardComponent userProfile={userProfile} />;
}