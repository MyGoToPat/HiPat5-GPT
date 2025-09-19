import React from "react";
import { Link } from "react-router-dom";

export default function BetaPendingPage() {
  return (
    <div className="min-h-screen bg-pat-gradient flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-pat-card max-w-md w-full mx-auto text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Thanks for signing up</h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          You're being considered for beta access. Once approved, you'll be able to log in.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}