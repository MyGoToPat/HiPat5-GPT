import React from 'react';
import { Outlet } from 'react-router-dom';
import InlineMenu from '../components/Nav/InlineMenu';

export default function AppLayout() {
  return (
    <div style={root}>
      <main style={main}>
        <InlineMenu />
        <Outlet />
      </main>
    </div>
  );
}

const root: React.CSSProperties = {};
const main: React.CSSProperties = { position: 'relative', padding: '16px', paddingTop: '16px', minHeight: '100vh' };