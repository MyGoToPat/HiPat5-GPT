import React from "react";
import AgentTestModal from "@/components/admin/agents/AgentTestModal";

// Legacy store removed
const resetPersonalityState = () => {};

export default function AgentBulkActions() {
  const [openTest, setOpenTest] = React.useState(false);

  function onRestore() {
    if (!confirm("Restore Pat's Personality defaults? This overwrites local changes.")) return;
    resetPersonalityState();
    window.dispatchEvent(new CustomEvent("hipat:personality:refresh"));
  }

  return (
    <div className="flex items-center gap-2">
      <button 
        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm transition-colors" 
        onClick={onRestore}
      >
        Restore Pat's Personality Defaults
      </button>
      <button 
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors" 
        onClick={() => setOpenTest(true)}
      >
        Test Role
      </button>
      <AgentTestModal open={openTest} onClose={() => setOpenTest(false)} />
    </div>
  );
}