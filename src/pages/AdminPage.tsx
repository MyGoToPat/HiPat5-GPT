import { AdminGuard } from '../hooks/useRole';
import AdminUsersTable from '../components/admin/AdminUsersTable';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24 }}>
        <h1>Admin Dashboard</h1>
        <p>You are signed in with admin privileges.</p>
        <AdminUsersTable />
      </div>
    </AdminGuard>
  );
}