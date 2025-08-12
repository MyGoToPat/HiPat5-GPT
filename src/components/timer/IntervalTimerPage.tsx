import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Play, Zap } from 'lucide-react';
import { useTimer, getQuickStartPreset, importPreset } from '../../context/TimerContext';
import { PresetList } from './PresetList';
import { IntervalDesigner } from './IntervalDesigner';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TimerSettings } from './TimerSettings';
import { useTimerEngine } from '../../hooks/useTimerEngine';

interface IntervalTimerPageProps {
  onBack: () => void;
}

type Panel = 'presets' | 'designer' | 'timer' | 'settings';

export const IntervalTimerPage: React.FC<IntervalTimerPageProps> = ({ onBack }) => {
  const [activePanel, setActivePanel] = useState<Panel>('presets');
  const [showSettings, setShowSettings] = useState(false);
  const { activePreset, setActivePreset, savePreset } = useTimer();
  
  const timerEngine = useTimerEngine(activePreset, {
    onTick: (timeRemaining, totalElapsed) => {
      // Update document title with remaining time when running
      if (timeRemaining > 0) {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        document.title = `${mins}:${secs.toString().padStart(2, '0')} - Interval Timer`;
      }
    },
    onFinish: () => {
      document.title = 'Interval Timer - Complete!';
      // Return to presets after a delay
      setTimeout(() => {
        setActivePanel('presets');
        document.title = 'HiPat - Your Personal AI Assistant';
      }, 3000);
    }
  });

  // Check for preset import from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get('preset');
    
    if (presetParam) {
      const importedPreset = importPreset(presetParam);
      if (importedPreset) {
        savePreset(importedPreset);
        setActivePreset(importedPreset);
        setActivePanel('timer');
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [savePreset, setActivePreset]);

  // Reset document title on unmount
  useEffect(() => {
    return () => {
      document.title = 'HiPat - Your Personal AI Assistant';
    };
  }, []);

  const handleQuickStart = () => {
    const quickPreset = getQuickStartPreset();
    setActivePreset(quickPreset);
    setActivePanel('timer');
    // Auto-start the timer
    setTimeout(() => {
      timerEngine.start();
    }, 500);
  };

  const handleStartTimer = (preset: any) => {
    setActivePreset(preset);
    setActivePanel('timer');
  };

  const handleEditPreset = (preset: any) => {
    setActivePreset(preset);
    setActivePanel('designer');
  };

  const handleSavePreset = (preset: any) => {
    savePreset(preset);
    setActivePanel('presets');
  };

  const panelVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'presets':
        return (
          <PresetList
            onStartTimer={handleStartTimer}
            onEditPreset={handleEditPreset}
            onQuickStart={handleQuickStart}
          />
        );
      
      case 'designer':
        return (
          <IntervalDesigner
            preset={activePreset}
            onSave={handleSavePreset}
            onCancel={() => setActivePanel('presets')}
          />
        );
      
      case 'timer':
        return (
          <div className="h-full flex flex-col">
            <TimerDisplay
              timerEngine={timerEngine}
              className="flex-1"
            />
            <TimerControls
              timerEngine={timerEngine}
              onBack={() => setActivePanel('presets')}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Interval Timer</h1>
            {activePreset && (
              <p className="text-sm text-gray-600">{activePreset.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activePanel === 'presets' && (
            <button
              onClick={handleQuickStart}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Zap size={16} />
              Quick 30/30
            </button>
          )}
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={0}>
          <motion.div
            key={activePanel}
            custom={0}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="absolute inset-0"
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <TimerSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};