import React from 'react';

interface DebugInfo {
  routeTaken?: string;
  postAgentsExecuted?: Array<{ id: string; status: 'success' | 'failed' }>;
  protectedBulletsPreserved?: boolean;
  timestamp?: string;
}

interface DebugPanelProps {
  info: DebugInfo;
}

export default function DebugPanel({ info }: DebugPanelProps) {
  // Only show in development or when ?debug=1 is present
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('debug=1')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-xs p-4 rounded-lg shadow-lg max-w-sm z-50 border border-gray-700">
      <div className="font-bold mb-2 text-yellow-400">🐛 Debug Panel</div>

      <div className="space-y-2">
        <div>
          <span className="text-gray-400">Route:</span>{' '}
          <span className="font-mono text-green-400">{info.routeTaken || 'unknown'}</span>
        </div>

        {info.postAgentsExecuted && (
          <div>
            <span className="text-gray-400">Post-agents:</span>
            <div className="mt-1 space-y-1 ml-2">
              {info.postAgentsExecuted.map((agent, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={agent.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                    {agent.status === 'success' ? '✔' : '✖'}
                  </span>
                  <span className="font-mono text-xs">{agent.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {info.protectedBulletsPreserved !== undefined && (
          <div>
            <span className="text-gray-400">Bullets preserved:</span>{' '}
            <span className={info.protectedBulletsPreserved ? 'text-green-400' : 'text-red-400'}>
              {info.protectedBulletsPreserved ? 'yes' : 'no'}
            </span>
          </div>
        )}

        {info.timestamp && (
          <div className="text-gray-500 text-xs mt-2 pt-2 border-t border-gray-700">
            {info.timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
