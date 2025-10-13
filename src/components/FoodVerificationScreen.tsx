import React, { useState, useEffect } from 'react';
import { Check, X, CreditCard as Edit3, ChevronDown, Camera, Barcode, Type, RotateCcw, AlertTriangle } from 'lucide-react';
import ThinkingAvatar from './common/ThinkingAvatar';
import { PortionControls } from './meal/PortionControls';
import type {
  AnalysisResult,
  AnalysedFoodItemWithCandidates,
  NormalizedMealData,
  NormalizedMealLog,
  NormalizedMealItem,
  TDEEComparison
} from '../types/food';

interface SelectedItem {
  include: boolean;
  chosenCandidateIndex: number;
  currentGrams: number;
  currentMacros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  position: number;
}

interface FoodVerificationScreenProps {
  analysisResult: AnalysisResult;
  onConfirm: (normalizedMeal: NormalizedMealData) => void;
  onCancel: () => void;
  onEditManually?: () => void;
  isLoading?: boolean;
  onRetryAnalysis?: () => void;
  error?: string;
  tdeeComparison?: TDEEComparison; // TDEE comparison data
}

export const FoodVerificationScreen: React.FC<FoodVerificationScreenProps> = ({
  analysisResult,
  onConfirm,
  onCancel,
  onEditManually,
  isLoading = false,
  onRetryAnalysis,
  error,
  tdeeComparison
}) => {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown'>('unknown');
  const [note, setNote] = useState<string>('');

  // Initialize meal slot based on time or analysis result
  const determineMealSlot = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown' => {
    if (analysisResult.meal_slot) {
      return analysisResult.meal_slot;
    }
    
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 21) return 'dinner';
    return 'snack';
  };

  // Initialize state from analysis result
  useEffect(() => {
    const initialSlot = determineMealSlot();
    setMealSlot(initialSlot);

    const items = analysisResult.items.map((item, index) => {
      const baseGrams = Number(item.grams) || 100; // Default to 100g if not specified
      const baseMacros = {
        kcal: Number(item.macros?.kcal) || 0,
        protein_g: Number(item.macros?.protein_g) || 0,
        carbs_g: Number(item.macros?.carbs_g) || 0,
        fat_g: Number(item.macros?.fat_g) || 0,
      };
      
      return {
        include: true,
        chosenCandidateIndex: 0,
        currentGrams: baseGrams,
        currentMacros: baseMacros,
        position: index,
      };
    });
    
    setSelectedItems(items);
  }, [analysisResult]);

  // Calculate total macros and TEF
  const calculateTotals = () => {
    const includedItems = selectedItems.filter(item => item.include);
    
    const totals = includedItems.reduce(
      (acc, item) => ({
        kcal: acc.kcal + (Number(item.currentMacros.kcal) || 0),
        protein_g: acc.protein_g + (Number(item.currentMacros.protein_g) || 0),
        carbs_g: acc.carbs_g + (Number(item.currentMacros.carbs_g) || 0),
        fat_g: acc.fat_g + (Number(item.currentMacros.fat_g) || 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Calculate TEF: 0.20*proteinCal + 0.07*carbCal + 0.03*fatCal
    const proteinCal = totals.protein_g * 4;
    const carbCal = totals.carbs_g * 4;
    const fatCal = totals.fat_g * 9;
    const tef_kcal = Math.round((0.20 * proteinCal) + (0.07 * carbCal) + (0.03 * fatCal));
    const net_kcal = totals.kcal - tef_kcal;

    return { ...totals, tef_kcal, net_kcal };
  };

  const totals = calculateTotals();

  const handleItemToggle = (index: number) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, include: !item.include } : item
    ));
  };

  const handleCandidateChange = (itemIndex: number, candidateIndex: number) => {
    const originalItem = analysisResult.items[itemIndex];
    const selectedCandidate = originalItem.candidates?.[candidateIndex];
    
    if (!selectedCandidate) return;

    setSelectedItems(prev => prev.map((item, i) => {
      if (i === itemIndex) {
        // Reset to candidate's base grams and macros
        const candidateGrams = Number(originalItem.grams) || 100;
        const candidateMacros = {
          kcal: Number(selectedCandidate.macros.kcal) || 0,
          protein_g: Number(selectedCandidate.macros.protein_g) || 0,
          carbs_g: Number(selectedCandidate.macros.carbs_g) || 0,
          fat_g: Number(selectedCandidate.macros.fat_g) || 0,
        };
        
        return {
          ...item,
          chosenCandidateIndex: candidateIndex,
          currentGrams: candidateGrams,
          currentMacros: candidateMacros,
        };
      }
      return item;
    }));
  };

  const handlePortionChange = (itemIndex: number, portion: { grams: number; macros: any }) => {
    setSelectedItems(prev => prev.map((item, i) =>
      i === itemIndex
        ? {
            ...item,
            currentGrams: Number(portion.grams) || 0,
            currentMacros: {
              kcal: Number(portion.macros.kcal) || 0,
              protein_g: Number(portion.macros.protein_g) || 0,
              carbs_g: Number(portion.macros.carbs_g) || 0,
              fat_g: Number(portion.macros.fat_g) || 0,
            }
          }
        : item
    ));
  };

  const handleManualMacroChange = (itemIndex: number, macroKey: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g', value: number) => {
    setSelectedItems(prev => prev.map((item, i) =>
      i === itemIndex
        ? {
            ...item,
            currentMacros: {
              ...item.currentMacros,
              [macroKey]: value
            }
          }
        : item
    ));
  };

  const handleConfirm = () => {
    const includedItems = selectedItems.filter(item => item.include);
    
    if (includedItems.length === 0) {
      return;
    }

    const mealLog: NormalizedMealLog = {
      ts: new Date().toISOString(),
      meal_slot: mealSlot,
      source: analysisResult.source,
      totals: {
        kcal: totals.kcal,
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        tef_kcal: totals.tef_kcal,
      },
      note: note || undefined,
      client_confidence: includedItems.reduce((sum, item) => {
        const originalItem = analysisResult.items[item.position];
        const candidate = originalItem.candidates?.[item.chosenCandidateIndex];
        const confidence = Number(candidate?.confidence || originalItem.confidence) || 0.8;
        return sum + confidence;
      }, 0) / includedItems.length,
    };

    const mealItems: NormalizedMealItem[] = includedItems.map((item, index) => {
      const originalItem = analysisResult.items[item.position];
      const candidate = originalItem.candidates?.[item.chosenCandidateIndex];
      const itemName = candidate?.name || originalItem.name;
      const itemBrand = candidate?.brand || originalItem.brand;
      
      return {
        position: index,
        cache_id: `item-${item.position}-${Date.now()}`,
        name: itemName,
        brand: itemBrand,
        qty: 1,
        unit: 'serving',
        grams: item.currentGrams,
        macros: item.currentMacros,
        confidence: Number(candidate?.confidence || originalItem.confidence) || 0.8,
        source_hints: originalItem.source_hints,
      };
    });

    const normalizedMeal: NormalizedMealData = {
      mealLog,
      mealItems,
    };

    onConfirm(normalizedMeal);
  };

  const getSourceIcon = () => {
    switch (analysisResult.source) {
      case 'photo':
        return <Camera size={14} className="text-blue-500" />;
      case 'barcode':
        return <Barcode size={14} className="text-green-500" />;
      case 'text':
        return <Type size={14} className="text-purple-500" />;
      default:
        return <Camera size={14} className="text-gray-500" />;
    }
  };

  const getSourceLabel = () => {
    switch (analysisResult.source) {
      case 'photo':
        return 'Photo';
      case 'barcode':
        return 'Barcode';
      case 'text':
        return 'Text';
      default:
        return 'Unknown';
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <ThinkingAvatar size={60} label="Fetching nutrition data..." className="justify-center mb-4" />
          <p className="text-gray-600 text-sm">Searching for nutrition data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            {onRetryAnalysis && (
              <button
                onClick={onRetryAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                Retry Analysis
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Verify Your Food</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
            {getSourceIcon()}
            <span className="text-xs font-medium text-gray-700">{getSourceLabel()}</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm">Review and adjust the detected items before logging</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* TODAY'S KPIs Banner */}
        {tdeeComparison && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">TODAY'S TOTALS</h3>
            <div className="grid grid-cols-5 gap-2 text-sm">
              <div>
                <div className="text-gray-600 text-xs">Calories</div>
                <div className="font-bold text-gray-900">{tdeeComparison.consumed_today?.kcal || 0}</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">Protein</div>
                <div className="font-bold text-gray-900">{tdeeComparison.consumed_today?.protein_g || 0}g</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">Fat</div>
                <div className="font-bold text-gray-900">{tdeeComparison.consumed_today?.fat_g || 0}g</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">Carbs</div>
                <div className="font-bold text-gray-900">{tdeeComparison.consumed_today?.carbs_g || 0}g</div>
              </div>
              <div>
                <div className="text-gray-600 text-xs">Fiber</div>
                <div className="font-bold text-gray-900">{tdeeComparison.consumed_today?.fiber_g || 0}g</div>
              </div>
            </div>
          </div>
        )}

        {/* Food Items List */}
        <div className="space-y-4 mb-6">
          {analysisResult.items.map((originalItem, index) => {
            const selectedItem = selectedItems[index];
            if (!selectedItem) return null;

            const currentCandidate = originalItem.candidates?.[selectedItem.chosenCandidateIndex];
            const displayItem = currentCandidate || originalItem;
            const baseGrams = Number(originalItem.grams) || 100;

            return (
              <div
                key={index}
                className={`p-6 border-2 rounded-xl transition-all ${
                  selectedItem.include 
                    ? 'border-green-200 bg-green-50 shadow-sm' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-start gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={selectedItem.include}
                    onChange={() => handleItemToggle(index)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{displayItem.name}</h3>
                        {displayItem.brand && (
                          <p className="text-sm text-gray-600">{displayItem.brand}</p>
                        )}
                        {originalItem.originalText && (
                          <p className="text-xs text-gray-500 italic">From: "{originalItem.originalText}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          (Number(displayItem.confidence) || 0.8) >= 0.8 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}>
                          {Math.round((Number(displayItem.confidence) || 0.8) * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    {/* Candidate Switcher */}
                    {originalItem.candidates && originalItem.candidates.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Alternative matches:
                        </label>
                        <div className="relative">
                          <select
                            value={selectedItem.chosenCandidateIndex}
                            onChange={(e) => handleCandidateChange(index, parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                          >
                            {originalItem.candidates.map((candidate, candIndex) => (
                              <option key={candIndex} value={candIndex}>
                                {candidate.name} {candidate.brand ? `(${candidate.brand})` : ''} - {Math.round((Number(candidate.confidence) || 0.8) * 100)}%
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Portion Controls */}
                    {selectedItem.include && (
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Portion size:
                        </label>
                        <PortionControls
                          baseServingGrams={baseGrams}
                          baseServingMacros={displayItem.macros || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }}
                          initialGrams={selectedItem.currentGrams}
                          onPortionChange={(portion) => handlePortionChange(index, portion)}
                        />
                        
                        {/* Current Macros Display - Editable */}
                        <div className="mt-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">Macros (tap to edit manually)</div>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="p-2 bg-gray-50 rounded">
                              <input
                                type="number"
                                value={selectedItem.currentMacros.kcal}
                                onChange={(e) => handleManualMacroChange(index, 'kcal', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm font-semibold text-gray-900 bg-transparent text-center border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                                min="0"
                                step="1"
                              />
                              <div className="text-xs text-gray-600">Calories</div>
                            </div>
                            <div className="p-2 bg-red-50 rounded">
                              <input
                                type="number"
                                value={selectedItem.currentMacros.protein_g}
                                onChange={(e) => handleManualMacroChange(index, 'protein_g', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm font-semibold text-red-700 bg-transparent text-center border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                                min="0"
                                step="0.1"
                              />
                              <div className="text-xs text-red-600">Protein</div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <input
                                type="number"
                                value={selectedItem.currentMacros.carbs_g}
                                onChange={(e) => handleManualMacroChange(index, 'carbs_g', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm font-semibold text-blue-700 bg-transparent text-center border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                                min="0"
                                step="0.1"
                              />
                              <div className="text-xs text-blue-600">Carbs</div>
                            </div>
                            <div className="p-2 bg-yellow-50 rounded">
                              <input
                                type="number"
                                value={selectedItem.currentMacros.fat_g}
                                onChange={(e) => handleManualMacroChange(index, 'fat_g', parseFloat(e.target.value) || 0)}
                                className="w-full text-sm font-semibold text-yellow-700 bg-transparent text-center border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1"
                                min="0"
                                step="0.1"
                              />
                              <div className="text-xs text-yellow-600">Fat</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timestamp Display - Auto-determined, not user-selectable */}
        <div className="mb-6 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Logged at:</span>
            <span className="text-sm text-gray-900">
              {new Date().toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>

        {/* Optional Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note (optional):
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this meal..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        {/* Totals Panel */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meal Totals</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totals.kcal}</div>
              <div className="text-sm text-gray-600">Calories</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{totals.protein_g.toFixed(1)}g</div>
              <div className="text-sm text-red-600">Protein</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{totals.carbs_g.toFixed(1)}g</div>
              <div className="text-sm text-blue-600">Carbs</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{totals.fat_g.toFixed(1)}g</div>
              <div className="text-sm text-yellow-600">Fat</div>
            </div>
          </div>

          {/* TEF and Net */}
          <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-200">
            <div className="text-gray-600">
              TEF (thermic effect): <span className="font-semibold text-orange-600">{totals.tef_kcal} cal</span>
            </div>
            <div className="text-gray-900">
              Net calories: <span className="font-bold text-green-600">{totals.net_kcal} cal</span>
            </div>
          </div>

          {/* Log Hint */}
          <div className="text-sm text-gray-600 whitespace-pre-line mt-3 pt-3 border-t border-gray-200">
            Just say "Log" if you want me to log this in your macros as a meal.
          </div>

          {/* How This Affects Today */}
          {tdeeComparison && (
            <div className={`mt-4 p-3 rounded-lg border ${
              tdeeComparison.on_track
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : tdeeComparison.daily_kcal_remaining < 0
                ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${
                tdeeComparison.on_track ? 'text-green-800' : tdeeComparison.daily_kcal_remaining < 0 ? 'text-red-800' : 'text-blue-800'
              }`}>
                How this affects today:
              </p>
              <p className={`text-sm ${
                tdeeComparison.on_track ? 'text-green-700' : tdeeComparison.daily_kcal_remaining < 0 ? 'text-red-700' : 'text-blue-700'
              }`}>
                {tdeeComparison.message}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className={tdeeComparison.on_track ? 'text-green-700' : 'text-gray-600'}>
                  Calories: {tdeeComparison.daily_kcal_consumed}/{tdeeComparison.daily_kcal_target}
                </div>
                <div className={tdeeComparison.protein_remaining > 0 ? 'text-orange-700' : 'text-green-700'}>
                  Protein: {Math.round(tdeeComparison.protein_consumed)}g/{tdeeComparison.protein_target}g
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={selectedItems.filter(item => item.include).length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Check size={16} />
            Confirm & Log
          </button>
        </div>
      </div>
    </div>
  );
};