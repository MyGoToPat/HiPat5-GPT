import React from 'react';
import { ProfilePage as ProfileComponent } from '../components/ProfilePage';
import { DataSourceBadge } from '../lib/devDataSourceBadge';

export default function ProfilePage() {
  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <ProfileComponent />
    </div>
  );
}