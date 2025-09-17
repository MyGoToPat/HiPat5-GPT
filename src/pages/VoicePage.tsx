import React from 'react';
import { TalkingPatPage1 } from '../components/TalkingPatPage1';
import { useRole } from '../hooks/useRole';
import { ArrowLeft, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function VoicePage() {
  const { can } = useRole();
  const navigate = useNavigate();
  
  if (!can('voice.use')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Your role doesn't allow access to voice features yet.</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <TalkingPatPage1 />;
}