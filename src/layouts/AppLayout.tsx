import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/nav/TopNav';
import OrgSwitcher from '../components/orgs/OrgSwitcher';

export default function AppLayout() {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <TopNav />
        <OrgSwitcher />
      </div>
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}