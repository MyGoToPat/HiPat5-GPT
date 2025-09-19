import React from 'react';

export function DataSourceBadge({ source }: { source: 'live' | 'mock' | 'none' }) {
  if (import.meta.env.PROD) {
    return null; // Render nothing in production builds
  }

  const colors = {
    live: '#10b981', // green-500
    mock: '#f59e0b', // yellow-500
    none: '#6b7280', // gray-500
  };

  const labels = {
    live: 'LIVE',
    mock: 'MOCK',
    none: 'NONE',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: colors[source],
        opacity: 0.5,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {labels[source]}
    </div>
  );
}