import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Save, History, Eye, AlertCircle } from 'lucide-react';

interface PersonalityConfig {
  id: string;
  name: string;
  prompt: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const PersonalityEditorPage: React.FC = () => {
  const [config, setConfig] = useState<PersonalityConfig | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPersonality();
  }, []);

  useEffect(() => {
    if (config) {
      setHasChanges(editedPrompt !== config.prompt);
    }
  }, [editedPrompt, config]);

  async function loadPersonality() {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('personality_config')
        .select('*')
        .eq('name', 'master')
        .single();

      if (error) throw error;

      setConfig(data);
      setEditedPrompt(data.prompt);
    } catch (error) {
      console.error('Failed to load personality:', error);
      toast.error('Failed to load personality config');
    } finally {
      setLoading(false);
    }
  }

  async function saveChanges() {
    if (!config) return;

    setSaving(true);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('personality_config')
        .update({
          prompt: editedPrompt,
          version: config.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('name', 'master');

      if (error) throw error;

      toast.success(`Personality updated (v${config.version + 1})`);
      await loadPersonality();
    } catch (error) {
      console.error('Failed to save personality:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading personality configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400">Failed to load personality configuration</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Personality Editor</h1>
          <p className="text-gray-400">
            Edit Pat's master personality. Changes apply to all swarms immediately after deployment.
          </p>
        </div>

        {/* Meta Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Config Name</div>
              <div className="font-semibold">{config.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Version</div>
              <div className="font-semibold">v{config.version}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Status</div>
              <div className={`font-semibold ${config.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                {config.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Last Updated</div>
              <div className="font-semibold text-sm">
                {new Date(config.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {hasChanges && (
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-semibold text-yellow-400 mb-1">Unsaved Changes</div>
              <div className="text-sm text-gray-300">
                Your changes will only take effect after you save and redeploy the edge function.
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Master Personality Prompt</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Eye size={16} />
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                onClick={() => toast('Version history coming soon')}
              >
                <History size={16} />
                History
              </button>
            </div>
          </div>

          {showPreview ? (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 whitespace-pre-wrap font-mono text-sm text-gray-300 max-h-[600px] overflow-y-auto">
              {editedPrompt}
            </div>
          ) : (
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full h-[600px] bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter personality prompt..."
            />
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {editedPrompt.length} characters • {editedPrompt.split('\n').length} lines
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditedPrompt(config.prompt);
                  toast('Changes discarded');
                }}
                disabled={!hasChanges || saving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Swarms Using This Personality */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Swarms Using This Personality</h3>
          <div className="flex flex-wrap gap-2">
            {['AMA', 'TMWYA', 'Macro', 'MakeMeBetter', 'Persona'].map((swarm) => (
              <div
                key={swarm}
                className="px-3 py-1.5 bg-gray-700 rounded-full text-sm font-medium"
              >
                {swarm}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Changes to this personality will affect all listed swarms after edge function redeployment.
          </p>
        </div>

        {/* Deployment Instructions */}
        <div className="mt-6 bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">After Saving</h3>
          <p className="text-sm text-gray-300 mb-2">
            To apply changes to production, redeploy the edge function:
          </p>
          <code className="block bg-gray-900 px-3 py-2 rounded text-sm text-green-400">
            supabase functions deploy openai-chat
          </code>
        </div>
      </div>
    </div>
  );
};
