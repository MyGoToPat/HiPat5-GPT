import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/Nav/TopBar';

export default function AppLayout() {
  return (
    <div style={root}>
      <TopBar />
      <main style={main}><Outlet /></main>
    </div>
  );
}

const ROOT_H = 56; // TopBar height
const root: React.CSSProperties = { '--topbar-h': `${ROOT_H}px` } as any;
const main: React.CSSProperties = { padding: '16px', paddingTop: `calc(var(--topbar-h) + 8px)` };