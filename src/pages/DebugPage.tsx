import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types/user';

interface DebugPageProps {
  userProfile: UserProfile | null;
}

export default function DebugPage({ userProfile }: DebugPageProps) {
  const navigate = useNavigate();
  
  const handleNavigate = (page: string) => {
    switch (page) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'voice':
        navigate('/voice');
        break;
      case 'camera':
        navigate('/camera');
        break;
      case 'tdee-wizard':
        navigate('/tdee');
        break;
      case 'interval-timer':
        navigate('/interval-timer');
        break;
      case 'trainer-dashboard':
        navigate('/trainer-dashboard');
        break;
      case 'debug':
        navigate('/debug');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Debug Page</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Profile</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(userProfile, null, 2)}
          </pre>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'profile', label: 'Profile' },
              { key: 'chat', label: 'Chat' },
              { key: 'voice', label: 'Voice' },
              { key: 'camera', label: 'Camera' },
              { key: 'tdee-wizard', label: 'TDEE Wizard' },
              { key: 'interval-timer', label: 'Interval Timer' },
              { key: 'trainer-dashboard', label: 'Trainer Dashboard' },
              { key: 'admin', label: 'Admin' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleNavigate(key)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}