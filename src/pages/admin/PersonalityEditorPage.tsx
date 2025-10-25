import React from 'react';
import { Info } from 'lucide-react';

/**
 * LEGACY PERSONALITY EDITOR - RETIRED
 *
 * This page has been replaced by the 10-agent Personality Swarm system.
 * Pat's personality is now managed through Agent Configuration (Swarm Management).
 *
 * This page shows a retirement notice and redirects to the new system.
 */
export const PersonalityEditorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Legacy Personality Editor Retired
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Pat's personality is now managed through the <strong>10-agent Personality Swarm system</strong>.
            This provides better control, versioning, and modularity for Pat's conversation style.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">What changed?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Personality is now composed of 10 specialized agents</li>
              <li>• Each agent handles a specific aspect (voice, audience, safety, etc.)</li>
              <li>• Agents can be enabled/disabled individually</li>
              <li>• All prompts are stored in the database with version control</li>
            </ul>
          </div>
          <a
            href="/admin/swarms"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Go to Agent Configuration
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PersonalityEditorPage;
