import React from 'react';
import { AdminGuard } from '../hooks/useRole';
import AdminUsersTable from '../components/admin/AdminUsersTable';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Admin Dashboard</h1>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
          Build: {import.meta.env.MODE} — {new Date().toLocaleString()}
        </div>
        <AdminUsersTable />
      </div>
    </AdminGuard>
  );
}