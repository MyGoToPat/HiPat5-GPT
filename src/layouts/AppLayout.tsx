import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/Nav/TopBar';
import OrgSwitcher from '../components/orgs/OrgSwitcher';

export default function AppLayout() {
  return (
    <div>
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}