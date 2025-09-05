import React from "react";
import { Link } from "react-router-dom";

const btn =
  "inline-flex items-center rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 px-3 py-2 text-sm text-gray-100";

const QuickActions: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-2">
      <Link to="/chat" className={btn}>Chat with Pat</Link>
      <Link to="/dashboard" className={btn}>View Dashboard</Link>
      <Link to="/tdee" className={btn}>Run TDEE</Link>
    </div>
  );
};

export default QuickActions;