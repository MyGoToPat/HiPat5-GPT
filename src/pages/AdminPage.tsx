import React from 'react';
import { Link } from 'react-router-dom';
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

        <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/admin/roles"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Role Access Control
          </Link>
          <Link
            to="/admin/diagnostics"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            System Diagnostics
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Manage Users
          </Link>
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