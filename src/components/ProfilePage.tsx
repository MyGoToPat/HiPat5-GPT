import React from 'react';
export const ProfilePage: React.FC<{ onNavigate?: (page: string) => void }> = () => {
  return (
    <div className="p-6 text-gray-200">
      Restoring original Profile… (placeholder). Next step will drop in the full page.
    </div>
  );
};
export default ProfilePage;