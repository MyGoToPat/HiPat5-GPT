import React, { useEffect, useState } from 'react';
import { isAdmin } from '../../lib/auth/isAdmin';

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setOk(await isAdmin()); setLoading(false); })(); }, []);
  if (loading) return null;
  if (!ok) return <div style={{ padding: 24, color: '#fff' }}>
    <h1>404 - Not Found</h1><p>You do not have permission to view this page.</p>
  </div>;
  return <>{children}</>;
};
export default AdminGuard;