import React from 'react';
import { Link } from 'react-router-dom';
import { PatAvatar } from '../../components/PatAvatar';
import { Clock, ArrowLeft } from 'lucide-react';

export default function BetaPendingPage() {
  return (
    <div className="min-h-screen bg-pat-gradient flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-pat-card max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <PatAvatar size={80} mood="neutral" className="mx-auto mb-4" />
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={24} className="text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Under Review</h1>
        </div>

        {/* Main Message */}
        <div className="text-center mb-8">
          <p className="text-gray-300 text-lg leading-relaxed">
            Your application to be accepted as a Beta Tester is still under review.
          </p>
        </div>

        {/* Additional Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-gray-400 text-sm text-center">
            We'll notify you via email once your application has been processed.
          </p>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}