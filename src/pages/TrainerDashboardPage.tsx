import React from 'react';
import { TrainerDashboardPage as TrainerDashboardComponent } from '../components/TrainerDashboardPage';
import { UserProfile } from '../types/user';
import { DataSourceBadge } from '../lib/devDataSourceBadge';

interface TrainerDashboardPageProps {
  userProfile: UserProfile | null;
}

export default function TrainerDashboardPage({ userProfile }: TrainerDashboardPageProps) {
  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="mock" />
      <TrainerDashboardComponent userProfile={userProfile} />
    </div>
  );
}