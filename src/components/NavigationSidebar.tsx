import React from 'react';
export function NavigationSidebar() {
  return (
    <aside className="w-56 border-r h-screen p-3">
      <nav className="flex flex-col gap-2">
        <a href="#" className="opacity-70 hover:opacity-100">Home</a>
        <a href="#" className="opacity-70 hover:opacity-100">Profile</a>
        <a href="#" className="opacity-70 hover:opacity-100">Admin</a>
      </nav>
    </aside>
  );
}
export default NavigationSidebar;