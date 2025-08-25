import React, { useState, useEffect } from 'react';
import { Utensils, Settings, ChevronDown, ChevronUp, RotateCcw, Camera, Save, Undo, Plus } from 'lucide-react';
import { FoodItemRow } from '../../components/food/FoodItemRow';
import { MacroBadge } from '../../components/food/MacroBadge';
import { parseMeal, getFoodLogConfig, saveFoodLogConfig, saveEntry, listEntries, undoLast } from '../../lib/foodlog';
import type { FoodItem, MealAnalysis, FoodLogEntry, FoodLogConfig } from '../../types/foodlog';

export default function FoodLogPage() {
  const [mealText, setMealText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt Controls state
  const [config, setConfig] = useState<FoodLogConfig>(getFoodLogConfig());
  const [showControls, setShowControls] = useState(false);
  
  // Today's entries
  const [todaysEntries, setTodaysEntries] = useState<FoodLogEntry[]>([]);
  
  // Load config and today's entries on mount
  useEffect(() => {
    const loadedConfig = getFoodLogConfig();
    setConfig(loadedConfig);
    loadTodaysEntries(loadedConfig);
  }, []);

  // Save config when it changes
  useEffect(() => {
    saveFoodLogConfig(config);
  }, [config]);

  const loadTodaysEntries = (currentConfig: FoodLogConfig) => {
    const today = new Date().toISOString().split('T')[0];
    const entries = listEntries(today, currentConfig);
    setTodaysEntries(entries);
  };

  const handleAnalyze = () => {
    if (!mealText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = parseMeal(mealText, config);
      setAnalysis(result);
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfigChange = (updates: Partial<FoodLogConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleItemChange = (id: string, updates: Partial<FoodItem>) => {
    if (!analysis) return;
    
    const updatedItems = analysis.items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    
    // Recalculate totals
    const totals = updatedItems.reduce(
      (acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Round totals
    Object.keys(totals).forEach(key => {
      totals[key as keyof typeof totals] = Math.round(totals[key as keyof typeof totals] * 10) / 10;
    });

    setAnalysis({
      ...analysis,
      items: updatedItems,
      totals
    });
  };

  const handleSaveEntry = () => {
    if (!analysis || analysis.items.length === 0) return;
    
    const entry: FoodLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      items: analysis.items,
      totals: analysis.totals,
      notes: analysis.notes
    };
    
    saveEntry(entry, config);
    loadTodaysEntries(config);
    
    // Focus returns to Analyze button for a11y
    setTimeout(() => {
      document.getElementById('analyze-button')?.focus();
    }, 100);
  };

  const handleUndoLast = () => {
    const today = new Date().toISOString().split('T')[0];
    undoLast(today, config);
    loadTodaysEntries(config);
  };

  const resetToDefaults = () => {
    const defaultConfig: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'us',
      defaultServing: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      strictParsing: false
    };
    setConfig(defaultConfig);
  };

  const calculateDayTotals = () => {
    return todaysEntries.reduce(
      (acc, entry) => ({
        kcal: acc.kcal + entry.totals.kcal,
        protein: acc.protein + entry.totals.protein,
        carbs: acc.carbs + entry.totals.carbs,
        fat: acc.fat + entry.totals.fat
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const dayTotals = calculateDayTotals();

  return (
    <main className="min-h-screen bg-gray-50 p-6" aria-labelledby="food-log-h1">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 id="food-log-h1" className="text-3xl font-bold text-gray-900 mb-2">Food Log</h1>
          <p className="text-gray-600">
            Tell me what you ate and I'll analyze the nutrition content.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <section aria-labelledby="input-section">
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 id="input-section" className="text-lg font-semibold text-gray-900 mb-4">Meal Description</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="meal-text" className="block text-sm font-medium text-gray-700 mb-2">
                      What did you eat?
                    </label>
                    <textarea
                      id="meal-text"
                      value={mealText}
                      onChange={(e) => setMealText(e.target.value)}
                      placeholder="e.g., 2 eggs, toast with butter, black coffee"
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Image Upload Stub */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Camera size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Image upload (coming soon)</p>
                  </div>

                  <button
                    id="analyze-button"
                    onClick={handleAnalyze}
                    disabled={!mealText.trim() || isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Utensils size={20} />
                        Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Middle Column - Prompt Controls */}
          <section aria-labelledby="controls-section">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setShowControls(!showControls)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                aria-expanded={showControls}
                aria-controls="prompt-controls-panel"
              >
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-gray-600" />
                  <h2 id="controls-section" className="text-lg font-semibold text-gray-900">Prompt Controls</h2>
                </div>
                {showControls ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showControls && (
                <div id="prompt-controls-panel" className="p-6 pt-0 space-y-6">
                  {/* Diet Style */}
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-3">Diet Style</legend>
                    <div className="space-y-2">
                      {['standard', 'lowcarb', 'mediterranean'].map((style) => (
                        <label key={style} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="diet-style"
                            value={style}
                            checked={config.dietStyle === style}
                            onChange={(e) => handleConfigChange({ dietStyle: e.target.value as FoodLogConfig['dietStyle'] })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{style}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Units */}
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-3">Units</legend>
                    <div className="space-y-2">
                      {['us', 'metric'].map((unit) => (
                        <label key={unit} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="units"
                            value={unit}
                            checked={config.units === unit}
                            onChange={(e) => handleConfigChange({ units: e.target.value as FoodLogConfig['units'] })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 uppercase">{unit}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Default Serving Size */}
                  <div>
                    <label htmlFor="default-serving" className="block text-sm font-medium text-gray-700 mb-2">
                      Default Serving Size
                    </label>
                    <input
                      type="number"
                      id="default-serving"
                      value={config.defaultServing}
                      onChange={(e) => handleConfigChange({ defaultServing: parseFloat(e.target.value) || 1 })}
                      min="0.1"
                      max="10"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Timezone (readonly) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      {config.timezone}
                    </div>
                  </div>

                  {/* Strict Parsing Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Strict Parsing</p>
                      <p className="text-xs text-gray-500">Flag unknown items instead of ignoring</p>
                    </div>
                    <button
                      onClick={() => handleConfigChange({ strictParsing: !config.strictParsing })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.strictParsing ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      aria-pressed={config.strictParsing}
                      aria-label="Toggle strict parsing"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.strictParsing ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reset Controls */}
                  <button
                    onClick={resetToDefaults}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    <RotateCcw size={16} />
                    Reset to Defaults
                  </button>

                  {/* Config Preview */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h3>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Column - Results */}
          <section aria-labelledby="results-section" className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <span className="font-medium">Analysis Error</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-6" aria-live="polite">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 id="results-section" className="text-lg font-semibold text-gray-900 mb-4">
                    Analysis Results
                  </h2>
                  
                  {/* Food Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Food</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kcal</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">P</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">C</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">F</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Conf</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.items.map((item) => (
                          <FoodItemRow
                            key={item.id}
                            item={item}
                            onItemChange={handleItemChange}
                          />
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td className="px-3 py-3 font-bold text-blue-900">TOTALS</td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3 text-center font-bold text-blue-900">{analysis.totals.kcal}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-900">{analysis.totals.protein}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-900">{analysis.totals.carbs}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-900">{analysis.totals.fat}</td>
                          <td className="px-3 py-3 text-center font-bold text-blue-900">
                            {(analysis.confidence * 100).toFixed(0)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Analysis Notes */}
                  {analysis.notes.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h3 className="font-medium text-yellow-900 mb-2">Analysis Notes</h3>
                      <ul className="space-y-1">
                        {analysis.notes.map((note, index) => (
                          <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                            <span>•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleSaveEntry}
                      disabled={analysis.items.length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      <Save size={16} />
                      Save Entry
                    </button>
                    
                    <button
                      onClick={handleUndoLast}
                      disabled={todaysEntries.length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      <Undo size={16} />
                      Undo Last
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder when no analysis */}
            {!analysis && !isAnalyzing && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Utensils size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
                <p className="text-gray-600">
                  Describe your meal in the text area to get started.
                </p>
              </div>
            )}

            {/* Today's Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Log</h2>
                <div className="flex gap-2">
                  <MacroBadge label="Kcal" value={dayTotals.kcal} unit="" color="bg-blue-100 text-blue-800" />
                  <MacroBadge label="P" value={dayTotals.protein} color="bg-red-100 text-red-800" />
                  <MacroBadge label="C" value={dayTotals.carbs} color="bg-yellow-100 text-yellow-800" />
                  <MacroBadge label="F" value={dayTotals.fat} color="bg-green-100 text-green-800" />
                </div>
              </div>

              {todaysEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Plus size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No entries logged today</p>
                  <p className="text-gray-400 text-sm">Analyze a meal to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysEntries.map((entry, index) => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Entry #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.items.map(item => item.name).join(', ')}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <MacroBadge label="Kcal" value={entry.totals.kcal} unit="" color="bg-gray-100 text-gray-700" />
                        <MacroBadge label="P" value={entry.totals.protein} color="bg-gray-100 text-gray-700" />
                        <MacroBadge label="C" value={entry.totals.carbs} color="bg-gray-100 text-gray-700" />
                        <MacroBadge label="F" value={entry.totals.fat} color="bg-gray-100 text-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}