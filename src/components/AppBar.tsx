import React from 'react';

export function AppBar() {
  return (
    <header className="h-14 w-full border-b px-4 flex items-center justify-between">
      <div className="font-semibold">HiPat</div>
      <div className="flex items-center gap-3">
        {/* placeholder actions */}
      </div>
    </header>
  );
}

export default AppBar;