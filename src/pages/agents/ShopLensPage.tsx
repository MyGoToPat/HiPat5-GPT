import React, { useState, useEffect } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, Eye, Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { IngredientList } from '../../components/agents/IngredientList';
import { RiskBadge } from '../../components/agents/RiskBadge';
import { analyzeLabel, fetchUserFeedback, getConfig, saveConfig } from '../../lib/shoplens';
import type { Analysis, UserFeedback, ShopLensConfig } from '../../types/shoplens';

export default function ShopLensPage() {
  const [labelText, setLabelText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt Controls state
  const [config, setConfig] = useState<ShopLensConfig>(getConfig());
  const [showControls, setShowControls] = useState(false);
  const [bannedInput, setBannedInput] = useState('');
  const [cautionInput, setCautionInput] = useState('');

  // Load config on mount
  useEffect(() => {
    const loadedConfig = getConfig();
    setConfig(loadedConfig);
    setBannedInput(loadedConfig.banned.join(', '));
    setCautionInput(loadedConfig.caution.join(', '));
  }, []);

  // Save config when it changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleAnalyze = async () => {
    if (!labelText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeLabel(labelText, config);
      setAnalysis(result);
      
      // Fetch user feedback
      const userFeedback = await fetchUserFeedback(result.productName);
      setFeedback(userFeedback);
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setFeedback([]);
    setError(null);
    setLabelText('');
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleConfigChange = (updates: Partial<ShopLensConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleBannedChange = (value: string) => {
    setBannedInput(value);
    const banned = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    handleConfigChange({ banned });
  };

  const handleCautionChange = (value: string) => {
    setCautionInput(value);
    const caution = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    handleConfigChange({ caution });
  };

  const resetToDefaults = () => {
    const defaultConfig: ShopLensConfig = {
      sensitivity: 70,
      banned: [],
      caution: ['artificial', 'synthetic'],
      intendedUse: 'performance',
      strictLabelMode: false,
      allowProprietaryBlends: true
    };
    setConfig(defaultConfig);
    setBannedInput('');
    setCautionInput(defaultConfig.caution.join(', '));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ShopLens Nutrition</h1>
          <p className="text-gray-600">
            Analyze supplement labels to understand ingredients, verify claims, and assess safety.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Label Image</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Camera size={32} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Upload supplement label
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </span>
                </label>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Supplement label preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        URL.revokeObjectURL(imagePreview);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <label htmlFor="label-text" className="block text-lg font-semibold text-gray-900 mb-4">
                Label Text
              </label>
              <textarea
                id="label-text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                placeholder="Paste or type the supplement label text here..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter ingredients list, nutritional information, and any claims from the label.
              </p>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!labelText.trim() || isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Eye size={20} />
                  Analyze Label
                </>
              )}
            </button>
          </div>

          {/* Prompt Controls Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => setShowControls(!showControls)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                aria-expanded={showControls}
                aria-controls="prompt-controls-panel"
              >
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Prompt Controls</h2>
                </div>
                {showControls ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showControls && (
                <div id="prompt-controls-panel" className="p-6 pt-0 space-y-6">
                  {/* Sensitivity */}
                  <div>
                    <label htmlFor="sensitivity" className="block text-sm font-medium text-gray-700 mb-2">
                      Sensitivity: {config.sensitivity}%
                    </label>
                    <input
                      type="range"
                      id="sensitivity"
                      min="0"
                      max="100"
                      value={config.sensitivity}
                      onChange={(e) => handleConfigChange({ sensitivity: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Permissive</span>
                      <span>Strict</span>
                    </div>
                  </div>

                  {/* Banned Ingredients */}
                  <div>
                    <label htmlFor="banned-ingredients" className="block text-sm font-medium text-gray-700 mb-2">
                      Banned Ingredients
                    </label>
                    <input
                      type="text"
                      id="banned-ingredients"
                      value={bannedInput}
                      onChange={(e) => handleBannedChange(e.target.value)}
                      placeholder="yohimbine, dmaa, ephedra"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
                  </div>

                  {/* Caution Keywords */}
                  <div>
                    <label htmlFor="caution-keywords" className="block text-sm font-medium text-gray-700 mb-2">
                      Caution Keywords
                    </label>
                    <input
                      type="text"
                      id="caution-keywords"
                      value={cautionInput}
                      onChange={(e) => handleCautionChange(e.target.value)}
                      placeholder="artificial, synthetic, proprietary"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
                  </div>

                  {/* Intended Use */}
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-3">Intended Use</legend>
                    <div className="space-y-2">
                      {['performance', 'health', 'weight', 'other'].map((use) => (
                        <label key={use} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="intended-use"
                            value={use}
                            checked={config.intendedUse === use}
                            onChange={(e) => handleConfigChange({ intendedUse: e.target.value as ShopLensConfig['intendedUse'] })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{use}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Toggles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Strict Label Mode</p>
                        <p className="text-xs text-gray-500">Stricter analysis of unclear ingredients</p>
                      </div>
                      <button
                        onClick={() => handleConfigChange({ strictLabelMode: !config.strictLabelMode })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.strictLabelMode ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        aria-pressed={config.strictLabelMode}
                        aria-label="Toggle strict label mode"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.strictLabelMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Allow Proprietary Blends</p>
                        <p className="text-xs text-gray-500">Accept products with undisclosed amounts</p>
                      </div>
                      <button
                        onClick={() => handleConfigChange({ allowProprietaryBlends: !config.allowProprietaryBlends })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.allowProprietaryBlends ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        aria-pressed={config.allowProprietaryBlends}
                        aria-label="Toggle allow proprietary blends"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.allowProprietaryBlends ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
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
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Analysis Error</span>
                </div>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}

            {analysis && (
              <div className="space-y-6" aria-live="polite">
                {/* Product Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{analysis.productName}</h2>
                    <RiskBadge verdict={analysis.verdict} />
                  </div>
                  
                  {analysis.notes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Analysis Notes</h3>
                      <ul className="space-y-1">
                        {analysis.notes.map((note, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span>•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Ingredients ({analysis.ingredients.length})
                  </h2>
                  <IngredientList ingredients={analysis.ingredients} />
                </div>

                {/* Claims */}
                {analysis.claims.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Product Claims ({analysis.claims.length})
                    </h2>
                    <div className="space-y-3">
                      {analysis.claims.map((claim, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{claim.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 capitalize">{claim.category}</span>
                              {claim.credibility && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  claim.credibility === 'verified' ? 'bg-green-100 text-green-800' :
                                  claim.credibility === 'questionable' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {claim.credibility}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Feedback */}
                {feedback.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      User Feedback ({feedback.length})
                    </h2>
                    <div className="space-y-3">
                      {feedback.map((fb, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{fb.source}</span>
                            {fb.rating && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">★</span>
                                <span className="text-xs text-gray-500">{fb.rating}/5</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{fb.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset Button */}
                <button
                  onClick={resetAnalysis}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  Analyze Another Product
                </button>
              </div>
            )}

            {/* Placeholder when no analysis */}
            {!analysis && !isAnalyzing && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Eye size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
                <p className="text-gray-600">
                  Upload an image or enter label text to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}