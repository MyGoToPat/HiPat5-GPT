import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Bot } from 'lucide-react';
import { FEATURE_SHOPLENS } from '../../config/featureFlags';

export default function AgentsListPage() {
  const availableAgents = [];

  // Add ShopLens if feature flag is enabled
  if (FEATURE_SHOPLENS) {
    availableAgents.push({
      id: 'shoplens',
      title: 'ShopLens Nutrition',
      subtitle: 'Analyze supplement labels (deterministic stub).',
      path: '/agents/shoplens',
      icon: Eye,
      iconColor: 'text-blue-600',
      cardColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200'
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6" aria-labelledby="agents-h1">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 id="agents-h1" className="text-3xl font-bold text-gray-900 mb-2">Agents</h1>
          <p className="text-gray-600">
            Discover and access AI agents designed to help with your health and fitness goals.
          </p>
        </div>

        {/* Agents Grid */}
        {availableAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableAgents.map((agent) => {
              const IconComponent = agent.icon;
              return (
                <article
                  key={agent.id}
                  aria-label={agent.title}
                  className={`bg-gradient-to-br ${agent.cardColor} border ${agent.borderColor} rounded-xl p-6 hover:shadow-md transition-all`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <IconComponent size={24} className={agent.iconColor} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{agent.title}</h2>
                      <p className="text-sm text-gray-600">{agent.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={agent.path}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      aria-label={`Open ${agent.title}`}
                    >
                      <Eye size={16} />
                      Open
                    </Link>
                    
                    <button
                      disabled
                      aria-describedby="docs-tip"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                      aria-label={`Documentation for ${agent.title} (coming soon)`}
                    >
                      <FileText size={16} />
                      Docs
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No agents available</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Check back soon or enable features in configuration to access AI agents that can help with your health and fitness goals.
            </p>
          </div>
        )}

        {/* Hidden tooltip for screen readers */}
        <p id="docs-tip" className="sr-only">Coming soon</p>
      </div>
    </main>
  );
}