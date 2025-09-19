import React from 'react';
import { DashboardPage as DashboardComponent } from '../components/DashboardPage';
import { DataSourceBadge } from '../lib/devDataSourceBadge';

export default function DashboardPage() {
  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <DashboardComponent />
    </div>
  );
}