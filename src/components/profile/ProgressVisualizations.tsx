import React from "react";

const ProgressVisualizations: React.FC = () => {
  return (
    <div className="text-sm text-gray-300">
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className="h-2 bg-blue-600 w-1/2" />
      </div>
      <p className="mt-2 text-gray-400">
        Placeholder progress. Replace with real charts when available.
      </p>
    </div>
  );
};

export default ProgressVisualizations;