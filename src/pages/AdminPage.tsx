import React from 'react';
import { AdminGuard } from '../hooks/useRole';
import AdminUsersTable from '../components/admin/AdminUsersTable';
import MetricsSummary from '../components/admin/MetricsSummary';
import UpgradeRequests from '../components/admin/UpgradeRequests';
import { FeatureToggles } from '../components/admin/FeatureToggles';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24, paddingTop: 68 }}>
        <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
          Build: {import.meta.env.MODE} — {new Date().toLocaleString()}
        </div>

        <div style={{ marginBottom: 24 }}>
          <FeatureToggles />
        </div>

        <MetricsSummary />
        <AdminUsersTable />
        <UpgradeRequests />
      </div>
    </AdminGuard>
  );
}