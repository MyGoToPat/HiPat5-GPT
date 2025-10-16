import React, { useState } from 'react';
import { X, Play, Save } from 'lucide-react';
import { useSwarmsStore } from '../../store/swarms';
import { FilterPipeline } from '../../core/swarm/filters';
import { ResponseRenderer } from '../../core/swarm/renderer';
import type { ResponseObject } from '../../types/swarm';
import toast from 'react-hot-toast';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentPromptId?: string;
  swarmId?: string;
}

export function TestRunnerModal({ isOpen, onClose, agentPromptId, swarmId }: TestRunnerModalProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<any>(null);
  const [filterResult, setFilterResult] = useState<any>(null);
  const [presenterOutput, setPresenterOutput] = useState('');
  const [finalRender, setFinalRender] = useState('');
  const [metrics, setMetrics] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [personaOverride, setPersonaOverride] = useState(false);

  const { createTestRun } = useSwarmsStore();

  if (!isOpen) return null;

  const handleRun = async () => {
    if (!input.trim()) {
      toast.error('Please enter test input');
      return;
    }

    setRunning(true);
    const startTime = Date.now();

    try {
      const mockResponseObject: ResponseObject = {
        type: 'nutrition',
        payload: {
          items: [
            {
              name: input,
              qty: 1,
              unit: 'serving',
              kcal: 300,
              protein_g: 20,
              carbs_g: 30,
              fat_g: 10,
              fiber_g: 5
            }
          ],
          totals: {
            kcal: 300,
            protein_g: 20,
            carbs_g: 30,
            fat_g: 10,
            fiber_g: 5
          }
        },
        issues: [],
        followups: [],
        protected_fields: ['totals.kcal', 'totals.protein_g', 'totals.carbs_g', 'totals.fat_g'],
        suggested_tone: 'casual'
      };

      setOutput(mockResponseObject);

      const filterPipeline = await FilterPipeline.create('test-user-id');
      const filterRes = filterPipeline
        ? await filterPipeline.applyAll(mockResponseObject.payload, personaOverride)
        : { annotations: [], substitutions: [], warnings: [] };

      setFilterResult(filterRes);

      mockResponseObject.issues.push(
        ...filterRes.annotations.map(a => ({
          field: a.field,
          message: a.message,
          severity: a.severity as 'info' | 'warning' | 'error'
        }))
      );

      const rendered = ResponseRenderer.compose([mockResponseObject], {
        applyPersona: true,
        personaTone: 'casual'
      });

      setPresenterOutput(rendered);
      setFinalRender(rendered);

      const endTime = Date.now();
      const metrics = {
        total_latency_ms: endTime - startTime,
        filter_latency_ms: 50,
        presenter_latency_ms: 30,
        render_latency_ms: 20,
        token_usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };

      setMetrics(metrics);

      if (agentPromptId) {
        await createTestRun({
          agent_prompt_id: agentPromptId,
          input: { text: input },
          output: mockResponseObject,
          model: 'test-runner',
          token_usage: metrics.token_usage,
          latency_ms: metrics.total_latency_ms,
          notes: 'Test run from admin UI'
        });
      }

      toast.success('Test run completed');
    } catch (e: any) {
      toast.error('Test run failed: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    if (!output || !agentPromptId) return;

    try {
      await createTestRun({
        agent_prompt_id: agentPromptId,
        input: { text: input },
        output,
        model: 'test-runner',
        token_usage: metrics?.token_usage,
        latency_ms: metrics?.total_latency_ms,
        notes: 'Saved test case'
      });

      toast.success('Test case saved');
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Test Runner</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Input (meal description or query)
            </label>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="checkbox"
                id="persona-override"
                checked={personaOverride}
                onChange={(e) => setPersonaOverride(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="persona-override" className="text-sm text-gray-700">
                Bypass Persona Filters (Override)
              </label>
              {personaOverride && (
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                  Override Active
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter test input... e.g., 'grilled chicken breast with rice and broccoli'"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Play size={16} />
                  {running ? 'Running...' : 'Run Test'}
                </button>
                {output && agentPromptId && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>

          {output && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">1. Raw ResponseObject</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded border border-gray-200">
                  {JSON.stringify(output, null, 2)}
                </pre>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">2. Filter Output</h3>
                {filterResult && (
                  <div className="space-y-2">
                    {filterResult.annotations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Annotations:</p>
                        {filterResult.annotations.map((a: any, i: number) => (
                          <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200 mb-1">
                            <span
                              className={`font-medium ${
                                a.severity === 'error'
                                  ? 'text-red-600'
                                  : a.severity === 'warning'
                                  ? 'text-yellow-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {a.severity}:
                            </span>{' '}
                            {a.message}
                          </div>
                        ))}
                      </div>
                    )}
                    {filterResult.substitutions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Substitutions:</p>
                        {filterResult.substitutions.map((s: any, i: number) => (
                          <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200 mb-1">
                            {s.original} → {s.suggested}
                            <br />
                            <span className="text-gray-500">{s.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {filterResult.warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Warnings:</p>
                        {filterResult.warnings.map((w: string, i: number) => (
                          <div key={i} className="text-xs bg-white p-2 rounded border border-gray-200 mb-1">
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                    {filterResult.annotations.length === 0 &&
                      filterResult.substitutions.length === 0 &&
                      filterResult.warnings.length === 0 && (
                        <p className="text-xs text-gray-500">No filters triggered</p>
                      )}
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">3. Presenter Output</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap">
                  {presenterOutput}
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">4. Final Render</h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap">
                  {finalRender}
                </pre>
              </div>
            </div>
          )}

          {metrics && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Metrics</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Latency</p>
                  <p className="font-semibold">{metrics.total_latency_ms}ms</p>
                </div>
                <div>
                  <p className="text-gray-600">Filter Phase</p>
                  <p className="font-semibold">{metrics.filter_latency_ms}ms</p>
                </div>
                <div>
                  <p className="text-gray-600">Presenter Phase</p>
                  <p className="font-semibold">{metrics.presenter_latency_ms}ms</p>
                </div>
                <div>
                  <p className="text-gray-600">Render Phase</p>
                  <p className="font-semibold">{metrics.render_latency_ms}ms</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Tokens</p>
                  <p className="font-semibold">{metrics.token_usage?.total_tokens || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
