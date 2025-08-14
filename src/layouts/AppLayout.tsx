import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/nav/TopNav';

export default function AppLayout() {
  return (
    <div>
      <TopNav />
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}