import React from "react";
import { X, Play } from "lucide-react";

// Legacy orchestrator removed - stub for now
const runPersonalityPipeline = async (_params: any) => ({
  ok: false,
  answer: "Legacy orchestrator removed. Use new P3 system.",
  error: "Not implemented"
});

type Props = { open: boolean; onClose: () => void };

export default function AgentTestModal({ open, onClose }: Props) {
  const [q, setQ] = React.useState("Give me a 20-minute full-body workout at home with dumbbells.");
  const [out, setOut] = React.useState<string>("");
  const [isRunning, setIsRunning] = React.useState(false);

  if (!open) return null;

  async function run() {
    setIsRunning(true);
    setOut("Running personality pipeline...");
    
    try {
      const res = await runPersonalityPipeline({
        userMessage: q,
        context: {
          today: new Date().toISOString().slice(0, 10),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          audience: "beginner",
          free: { frequency: "3x/wk", rest: "7h", energy: "2,600 kcal", effort: "moderate" },
        },
      });
      
      if ((res as any).ok) {
        setOut((res as any).answer);
      } else {
        setOut(JSON.stringify(res, null, 2));
      }
    } catch (error) {
      setOut(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Test Pat's Personality</h2>
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
            onClick={onClose}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Message</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
              rows={5} 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              placeholder="Enter a message to test Pat's personality pipeline..."
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium transition-colors"
              onClick={run}
              disabled={isRunning || !q.trim()}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Personality Pipeline
                </>
              )}
            </button>
            <p className="text-sm text-gray-500">
              If the Edge Function <code className="bg-gray-100 px-1 rounded">ai_proxy</code> isn't deployed, you'll see a payload preview.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pipeline Output</label>
            <pre className="text-xs border border-gray-300 rounded-lg p-3 overflow-auto min-h-[280px] max-h-[400px] whitespace-pre-wrap bg-gray-50 text-gray-800">
              {out || "Click 'Run Personality Pipeline' to see results..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}