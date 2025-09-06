import React from 'react';
import { Outlet } from 'react-router-dom';
import InlineMenu from '../components/Nav/InlineMenu';
import { NAV_ITEMS } from '../config/nav';
import { getSessionRoles } from '../lib/auth/sessionRoles';

export default function AppLayout() {
  const [roles, setRoles] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { roles } = await getSessionRoles();
        setRoles(roles);
      } catch {
        setRoles([]); // safest default: no elevated roles
      }
    })();
  }, []);

  const visibleItems = React.useMemo(() => {
    if (roles === null) return NAV_ITEMS.filter(i => !i.roles); // hide role-gated items until loaded
    return NAV_ITEMS.filter(i => !i.roles || i.roles.some(r => roles.includes(r)));
  }, [roles]);

  return (
    <div style={root}>
      <main style={main}>
        <InlineMenu visibleItems={visibleItems} />
        <Outlet />
      </main>
    </div>
  );
}

const root: React.CSSProperties = {};
const main: React.CSSProperties = { position: 'relative', padding: '16px', paddingTop: '16px', minHeight: '100vh' };