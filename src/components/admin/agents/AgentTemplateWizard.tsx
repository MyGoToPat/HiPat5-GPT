import React, { useMemo, useState } from "react";
import { AgentConfig, AgentPhase, TonePreset } from "@/types/mcp";
import {
  getPersonalityAgents,
  getPersonalitySwarm,
  upsertPersonalityAgent,
  setPersonalitySwarm,
} from "@/state/personalityStore";

type Props = {
  open: boolean;
  onClose: () => void;
  editingAgent?: AgentConfig | null;
};

type TemplateKind = "classifier-pre" | "generator-main" | "rewriter-post";

const starterByTemplate = (kind: TemplateKind) => {
  switch (kind) {
    case "classifier-pre":
      return {
        phase: "pre" as AgentPhase,
        instructions:
          "Classify the last user message for affect and topical risk. Return strict JSON per schema.",
        promptTemplate:
          "Analyze the last user message. Return: {sentiment: negative|neutral|positive, arousal: low|med|high, flags: array<string>}.",
        responseFormat: "json" as const,
        jsonSchema:
          '{"type":"object","properties":{"sentiment":{"type":"string"},"arousal":{"type":"string"},"flags":{"type":"array","items":{"type":"string"}}},"required":["sentiment","arousal","flags"]}',
      };
    case "generator-main":
      return {
        phase: "generate" as AgentPhase,
        instructions:
          "Answer as Pat in first person. Spartan, precise, helpful. No emojis. Short lines. Active voice.",
        promptTemplate:
          "Use provided context and user message to produce the best possible answer in Pat's voice.",
        responseFormat: "text" as const,
        jsonSchema: null,
      };
    case "rewriter-post":
      return {
        phase: "post" as AgentPhase,
        instructions:
          "Rewrite the model answer to enforce Pat's style: first-person, concise, clear steps, banned words removed.",
        promptTemplate:
          "Given the draft answer, return a revised version that matches the tone and constraints.",
        responseFormat: "text" as const,
        jsonSchema: null,
      };
  }
};

export default function AgentTemplateWizard({ open, onClose, editingAgent }: Props) {
  const [template, setTemplate] = useState<TemplateKind>("classifier-pre");
  const starter = useMemo(() => starterByTemplate(template), [template]);

  const [id, setId] = useState(editingAgent?.id || "");
  const [name, setName] = useState(editingAgent?.name || "");
  const [phase, setPhase] = useState<AgentPhase>(editingAgent?.phase || starter.phase);
  const [enabled, setEnabled] = useState(editingAgent?.enabled ?? true);
  const [order, setOrder] = useState<number>(editingAgent?.order || (getPersonalitySwarm().length || 0) + 1);

  const [instructions, setInstructions] = useState(editingAgent?.instructions || starter.instructions);
  const [promptTemplate, setPromptTemplate] = useState(editingAgent?.promptTemplate || starter.promptTemplate);
  const [tonePreset, setTonePreset] = useState<TonePreset>(editingAgent?.tone?.preset || "spartan");
  const [toneNotes, setToneNotes] = useState(editingAgent?.tone?.notes || "");

  const [model, setModel] = useState(editingAgent?.api?.model || "gpt-4o-mini");
  const [temperature, setTemperature] = useState(editingAgent?.api?.temperature || 0.2);
  const [maxOutputTokens, setMaxOutputTokens] = useState(editingAgent?.api?.maxOutputTokens || 500);
  const [responseFormat, setResponseFormat] = useState<"text" | "json">(editingAgent?.api?.responseFormat as any || starter.responseFormat as any);
  const [jsonSchema, setJsonSchema] = useState<string | null>(editingAgent?.api?.jsonSchema || starter.jsonSchema);

  // Reset form when editing agent changes
  React.useEffect(() => {
    if (editingAgent) {
      setId(editingAgent.id);
      setName(editingAgent.name);
      setPhase(editingAgent.phase);
      setEnabled(editingAgent.enabled);
      setOrder(editingAgent.order);
      setInstructions(editingAgent.instructions);
      setPromptTemplate(editingAgent.promptTemplate);
      setTonePreset(editingAgent.tone.preset);
      setToneNotes(editingAgent.tone.notes || "");
      setModel(editingAgent.api.model);
      setTemperature(editingAgent.api.temperature);
      setMaxOutputTokens(editingAgent.api.maxOutputTokens);
      setResponseFormat(editingAgent.api.responseFormat as any);
      setJsonSchema(editingAgent.api.jsonSchema);
    } else {
      // Reset to defaults when not editing
      setId("");
      setName("");
      setPhase(starter.phase);
      setEnabled(true);
      setOrder((getPersonalitySwarm().length || 0) + 1);
      setInstructions(starter.instructions);
      setPromptTemplate(starter.promptTemplate);
      setTonePreset("spartan");
      setToneNotes("");
      setModel("gpt-4o-mini");
      setTemperature(0.2);
      setMaxOutputTokens(500);
      setResponseFormat(starter.responseFormat as any);
      setJsonSchema(starter.jsonSchema);
    }
  }, [editingAgent, starter]);
  // Only apply template changes when not editing
  React.useEffect(() => {
    if (!editingAgent) {
      setPhase(starter.phase);
      setInstructions(starter.instructions);
      setPromptTemplate(starter.promptTemplate);
      setResponseFormat(starter.responseFormat as any);
      setJsonSchema(starter.jsonSchema);
    }
  }, [starter, editingAgent]);

  if (!open) return null;

  const agents = getPersonalityAgents();
  const idExists = id && !!agents[id] && (!editingAgent || editingAgent.id !== id);

  const preview = {
    provider: "openai",
    model,
    messages: [
      { role: "system", content: instructions },
      { role: "system", content: promptTemplate },
    ],
    temperature,
    max_output_tokens: maxOutputTokens,
    response_format: responseFormat,
    json_schema: responseFormat === "json" ? jsonSchema : null,
  };

  function onSave() {
    if (!id || !name) return alert("Please provide an id and name.");
    if (!/^[a-z0-9-]+$/.test(id)) return alert("ID must be lowercase, numbers and hyphens only.");
    if (idExists) return alert("This agent ID already exists.");

    const cfg: AgentConfig = {
      id,
      name,
      phase,
      enabled,
      order,
      instructions,
      promptTemplate,
      tone: { preset: tonePreset, notes: toneNotes || undefined },
      api: {
        provider: "openai",
        model,
        temperature,
        maxOutputTokens,
        responseFormat,
        jsonSchema: responseFormat === "json" ? jsonSchema || "" : null,
      },
    };

    upsertPersonalityAgent(cfg);

    // update swarm ordering
    const swarm = Object.values(getPersonalityAgents())
      .filter((a) => a.enabled)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((a) => a.id);
    setPersonalitySwarm(swarm);

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingAgent ? 'Edit Personality Agent' : 'New Personality Agent'}
          </h2>
          <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>

        <div className="p-4 space-y-6">
          {/* Template */}
          {!editingAgent && (
            <section>
            <h3 className="font-semibold mb-2">Template</h3>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateKind)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="classifier-pre">Classifier (Pre)</option>
              <option value="generator-main">Generator (Main)</option>
              <option value="rewriter-post">Rewriter (Post)</option>
            </select>
            </section>
          )}

          {/* Basic Info */}
          <section>
            <h3 className="font-semibold mb-2">Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agent ID (slug)</label>
                <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g., clarity-coach-2"
                       className="w-full border rounded px-3 py-2"
                       disabled={!!editingAgent}/>
                {idExists && <p className="text-xs text-red-600 mt-1">ID already exists.</p>}
                {editingAgent && <p className="text-xs text-gray-600 mt-1">ID cannot be changed when editing.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name"
                       className="w-full border rounded px-3 py-2"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phase</label>
                <select value={phase} onChange={(e) => setPhase(e.target.value as AgentPhase)} className="w-full border rounded px-3 py-2">
                  <option value="pre">pre</option>
                  <option value="generate">generate</option>
                  <option value="post">post</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Order in Swarm</label>
                <input type="number" value={order} min={1} onChange={(e) => setOrder(parseInt(e.target.value || "1"))}
                       className="w-full border rounded px-3 py-2"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <label className="text-sm font-medium">Enabled</label>
              </div>
            </div>
          </section>

          {/* Instructions */}
          <section>
            <h3 className="font-semibold mb-2">Instructions</h3>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
                      className="w-full border rounded px-3 py-2 font-mono" rows={8}/>
          </section>

          {/* Prompt */}
          <section>
            <h3 className="font-semibold mb-2">Prompt</h3>
            <textarea value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)}
                      className="w-full border rounded px-3 py-2 font-mono" rows={8}/>
          </section>

          {/* Tone & API */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Tone</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Preset</label>
                  <select value={tonePreset} onChange={(e) => setTonePreset(e.target.value as any)} className="w-full border rounded px-3 py-2">
                    <option value="spartan">spartan</option>
                    <option value="neutral">neutral</option>
                    <option value="coach">coach</option>
                    <option value="scientist">scientist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={toneNotes} onChange={(e) => setToneNotes(e.target.value)}
                            className="w-full border rounded px-3 py-2" rows={3}/>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">API</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Provider</label>
                  <input value="openai" readOnly className="w-full border rounded px-3 py-2 bg-gray-100"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <input value={model} onChange={(e) => setModel(e.target.value)} className="w-full border rounded px-3 py-2"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature</label>
                    <input type="number" step="0.1" min="0" max="2" value={temperature}
                           onChange={(e) => setTemperature(parseFloat(e.target.value || "0"))}
                           className="w-full border rounded px-3 py-2"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Output Tokens</label>
                    <input type="number" min="1" value={maxOutputTokens}
                           onChange={(e) => setMaxOutputTokens(parseInt(e.target.value || "1"))}
                           className="w-full border rounded px-3 py-2"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Response Format</label>
                  <select value={responseFormat} onChange={(e) => setResponseFormat(e.target.value as any)}
                          className="w-full border rounded px-3 py-2">
                    <option value="text">text</option>
                    <option value="json">json</option>
                  </select>
                </div>
                {responseFormat === "json" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">JSON Schema</label>
                    <textarea value={jsonSchema ?? ""} onChange={(e) => setJsonSchema(e.target.value || null)}
                              className="w-full border rounded px-3 py-2 font-mono" rows={6}/>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Preview payload */}
          <section>
            <h3 className="font-semibold mb-2">Preview payload (no network call)</h3>
            <pre className="text-xs border rounded p-3 overflow-auto bg-gray-50 max-h-64">
{JSON.stringify(preview, null, 2)}
            </pre>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            <button className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white" onClick={onSave}>Save</button>
            <button className="px-4 py-2 rounded border hover:bg-gray-50" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}