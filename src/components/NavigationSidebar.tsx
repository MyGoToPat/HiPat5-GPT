import React from 'react';

export function NavigationSidebar() {
  return (
    <aside className="w-56 border-r h-screen p-3">
      <nav className="flex flex-col gap-2">
        <a className="opacity-80 hover:opacity-100" href="#">Home</a>
        <a className="opacity-80 hover:opacity-100" href="#">Profile</a>
        <a className="opacity-80 hover:opacity-100" href="#">Admin</a>
      </nav>
    </aside>
  );
}

export default NavigationSidebar;