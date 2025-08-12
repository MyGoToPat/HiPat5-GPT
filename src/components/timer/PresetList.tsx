import React, { useState } from 'react';
import { Play, Edit3, Trash2, Plus, Copy, Download, Clock, Repeat, Zap } from 'lucide-react';
import { useTimer, exportPreset } from '../../context/TimerContext';
import { TimerPreset } from '../../types/timer';

interface PresetListProps {
  onStartTimer: (preset: TimerPreset) => void;
  onEditPreset: (preset: TimerPreset) => void;
  onQuickStart: () => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  onStartTimer,
  onEditPreset,
  onQuickStart
}) => {
  const { presets, deletePreset } = useTimer();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleCopyPreset = async (preset: TimerPreset) => {
    try {
      const encodedPreset = exportPreset(preset);
      const shareUrl = `${window.location.origin}${window.location.pathname}?preset=${encodedPreset}`;
      await navigator.clipboard.writeText(shareUrl);
      
      // Show success feedback
      setSelectedPreset(preset.id);
      setTimeout(() => setSelectedPreset(null), 2000);
    } catch (error) {
      console.error('Failed to copy preset:', error);
    }
  };

  const handleDeletePreset = (preset: TimerPreset) => {
    if (preset.isBuiltIn) return;
    
    if (confirm(`Delete "${preset.name}"? This action cannot be undone.`)) {
      deletePreset(preset.id);
    }
  };

  const builtInPresets = presets.filter(p => p.isBuiltIn);
  const userPresets = presets.filter(p => !p.isBuiltIn);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Quick Start Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <button
          onClick={onQuickStart}
          className="w-full p-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap size={24} />
            <span className="text-xl font-bold">Quick 30/30</span>
          </div>
          <p className="text-green-100 text-sm">
            30 seconds work, 30 seconds rest × 4 rounds
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-green-100 text-sm">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>4 minutes</span>
            </div>
            <div className="flex items-center gap-1">
              <Repeat size={14} />
              <span>4 rounds</span>
            </div>
          </div>
        </button>
      </div>

      {/* Built-in Presets */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Built-in Presets</h2>
        <div key="built-in-presets-grid" className="grid gap-4">
          {builtInPresets.map((preset) => (
            <div
              key={preset.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{preset.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{preset.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDuration(preset.totalDuration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat size={14} />
                      <span>{preset.cycles} cycles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{preset.intervals.length} intervals</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleCopyPreset(preset)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy share link"
                  >
                    {selectedPreset === preset.id ? (
                      <Download size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} className="text-gray-400" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => onStartTimer(preset)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play size={16} />
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Presets */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Presets</h2>
          <button
            onClick={() => onEditPreset({
              id: crypto.randomUUID(),
              name: '',
              intervals: [],
              cycles: 1,
              totalDuration: 0,
              createdAt: new Date()
            })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create Preset
          </button>
        </div>

        {userPresets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No custom presets yet</h3>
            <p className="text-gray-600 mb-4">Create your first custom interval timer</p>
            <button
              onClick={() => onEditPreset({
                id: crypto.randomUUID(),
                name: '',
                intervals: [],
                cycles: 1,
                totalDuration: 0,
                createdAt: new Date()
              })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create Preset
            </button>
          </div>
        ) : (
          <div key="user-presets-grid" className="grid gap-4">
            {userPresets.map((preset) => (
              <div
                key={preset.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{preset.name}</h3>
                    {preset.description && (
                      <p className="text-gray-600 text-sm mb-3">{preset.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDuration(preset.totalDuration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Repeat size={14} />
                        <span>{preset.cycles} cycles</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{preset.intervals.length} intervals</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleCopyPreset(preset)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy share link"
                    >
                      {selectedPreset === preset.id ? (
                        <Download size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} className="text-gray-400" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => onEditPreset(preset)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit preset"
                    >
                      <Edit3 size={16} className="text-gray-400" />
                    </button>
                    
                    <button
                      onClick={() => handleDeletePreset(preset)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete preset"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                    
                    <button
                      onClick={() => onStartTimer(preset)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Play size={16} />
                      Start
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};