import React from 'react';
import { AppBar } from './components/AppBar';
import { NavigationSidebar } from './components/NavigationSidebar';
import { PatAvatar } from './components/PatAvatar';

export default function App() {
  return (
    <div className="min-h-screen flex">
      <NavigationSidebar />
      <div className="flex-1">
        <AppBar />
        <main className="p-4">
          <div className="flex items-center gap-3">
            <PatAvatar />
            <span>Welcome to HiPat</span>
          </div>
        </main>
      </div>
    </div>
  );
}