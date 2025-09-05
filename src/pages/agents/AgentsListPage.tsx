import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, ExternalLink, FileText } from 'lucide-react';

const FEATURE_SHOPLENS = import.meta.env.VITE_FEATURE_SHOPLENS !== 'false';

export default function AgentsListPage() {
  const agents = [];
  
  if (FEATURE_SHOPLENS) {
    agents.push({
      id: 'shoplens',
      name: 'ShopLens Nutrition',
      description: 'Analyze supplement labels (deterministic stub).',
      href: '/admin/agents/shoplens',
      icon: '🔍',
      available: true
    });
  }

  return (
    <main aria-labelledby="agents-h1" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 id="agents-h1" className="text-3xl font-bold text-gray-900 mb-2">Agents</h1>
          <p className="text-gray-600">
            AI-powered tools and assistants to help with your health and fitness journey.
          </p>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Bot size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents available</h3>
            <p className="text-gray-600">
              Check back soon or enable features in your environment configuration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <article key={agent.id} aria-label={agent.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">{agent.icon}</div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {agent.description}
                </p>
                
                <div className="flex items-center gap-3">
                  <Link
                    to={agent.href}
                    aria-label={`Open ${agent.name}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={16} />
                    Open
                  </Link>
                  
                  <button
                    disabled
                    aria-label={`Documentation for ${agent.name}`}
                    aria-describedby="docs-tip"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed"
                  >
                    <FileText size={16} />
                    Docs
                  </button>
                  <span id="docs-tip" className="sr-only">Coming soon</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}