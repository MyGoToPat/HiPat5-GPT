import React from "react";
import { invokeEdgeFunction } from "../../lib/personality/tools";

export default function OpenAIHealth() {
  async function ping() {
    const r = await invokeEdgeFunction("openai-chat", { 
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: "health check" }, 
        { role: "user", content: "ping" }
      ] 
    });
    alert(`openai-chat → ${r.status} :: ${r.text?.slice(0, 120)}`);
  }
  
  return (
    <button 
      onClick={ping} 
      className="px-2 py-1 text-xs border rounded hover:bg-gray-100 transition-colors"
    >
      Check OpenAI wiring
    </button>
  );
}