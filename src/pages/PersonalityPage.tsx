import React from 'react';
import { Link } from 'react-router-dom';
import { PatAvatar } from '../components/PatAvatar';
import { getSupabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Legacy import removed
const SWARM_TABS: any[] = [];

const sb = getSupabase();

const PersonalityPage: React.FC = () => {
  const [mainRolePrompt, setMainRolePrompt] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Load current main role prompt
  React.useEffect(() => {
    (async () => {
      try {
        // Find personality agent
        const { data: agent } = await sb
          .from('agents')
          .select('current_version_id')
          .eq('slug', 'personality')
          .single();

        if (agent?.current_version_id) {
          const { data: version } = await sb
            .from('agent_versions')
            .select('id, config, config_json')
            .eq('id', agent.current_version_id)
            .single();

          if (version) {
            const cfg = version.config ?? version.config_json ?? {};
            setMainRolePrompt(cfg.role?.prompt ?? '');
          }
        }
      } catch (error) {
        console.error('Failed to load personality prompt:', error);
      }
    })();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaving(true);
    try {
      // Find personality agent
      const { data: agent } = await sb
        .from('agents')
        .select('current_version_id')
        .eq('slug', 'personality')
        .single();

      if (agent?.current_version_id) {
        const { data: version } = await sb
          .from('agent_versions')
          .select('id, config, config_json')
          .eq('id', agent.current_version_id)
          .single();

        if (version) {
          const cfg = version.config ?? version.config_json ?? {};
          const next = { ...cfg, role: { ...(cfg.role || {}), prompt: mainRolePrompt } };

          await sb
            .from('agent_versions')
            .update({ config: next })
            .eq('id', version.id);

          toast.success('Main role prompt saved!');
        }
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      toast.error('Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-neutral-100">Pat's Personality</h1>
        <p className="text-sm text-neutral-400">Jarvis-like assistant. Minimal UI. Visuals for data. Conversation for insights.</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/chat" className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center gap-3">
          <PatAvatar interactionType="chat" /> 
          <div>
            <div className="text-neutral-100 font-medium">Chat with Pat</div>
            <div className="text-neutral-400 text-xs">Ask anything. Get guidance.</div>
          </div>
        </Link>
        <Link to="/talk" className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center gap-3">
          <PatAvatar interactionType="voice" />
          <div>
            <div className="text-neutral-100 font-medium">Talk with Pat</div>
            <div className="text-neutral-400 text-xs">Hands-free coaching.</div>
          </div>
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-300">Roles</h2>
        <div className="grid grid-cols-1 gap-3">
          {SWARM_TABS.map(r => (
            <Link key={r.id} to={`/chat?agent=${r.id}`} className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4">
              <div className="text-neutral-100 font-medium">{r.label}</div>
              <div className="text-neutral-400 text-xs mt-1">{r.blurb}</div>
              <div className="text-neutral-500 text-[11px] mt-2">Assigned agents: —</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Main Role Prompt Editor */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-300">Main Role Prompt</h2>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <div className="space-y-3">
            <textarea
              value={mainRolePrompt}
              onChange={(e) => setMainRolePrompt(e.target.value)}
              placeholder="Enter the main personality prompt for Pat..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-neutral-200 resize-none"
              rows={6}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSavePrompt}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Prompt'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PersonalityPage;