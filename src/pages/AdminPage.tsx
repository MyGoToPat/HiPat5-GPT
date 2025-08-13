import { AdminGuard } from '../hooks/useRole';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24 }}>
        <h1>Admin Dashboard</h1>
        <p>You are signed in with admin privileges.</p>
      </div>
    </AdminGuard>
  );
}