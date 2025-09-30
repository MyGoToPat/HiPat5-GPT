import React, { useState, useEffect } from 'react';
import { Check, X, Edit3, ChevronDown, Camera, Barcode, Type, RotateCcw, AlertTriangle } from 'lucide-react';
import { PortionControls } from './meal/PortionControls';
import type { 
  AnalysisResult, 
  AnalysedFoodItemWithCandidates, 
  NormalizedMealData, 
  NormalizedMealLog, 
  NormalizedMealItem 
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
}

export const FoodVerificationScreen: React.FC<FoodVerificationScreenProps> = ({
  analysisResult,
  onConfirm,
  onCancel,
  onEditManually,
  isLoading = false,
  onRetryAnalysis,
  error
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
      const baseGrams = item.grams || 100; // Default to 100g if not specified
      const baseMacros = item.macros || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      
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
        kcal: acc.kcal + item.currentMacros.kcal,
        protein_g: acc.protein_g + item.currentMacros.protein_g,
        carbs_g: acc.carbs_g + item.currentMacros.carbs_g,
        fat_g: acc.fat_g + item.currentMacros.fat_g,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Calculate TEF: 0.20*proteinCal + 0.07*carbCal + 0.03*fatCal
    const proteinCal = totals.protein_g * 4;
    const carbCal = totals.carbs_g * 4;
    const fatCal = totals.fat_g * 9;
    const tef_kcal = Math.round(0.20 * proteinCal + 0.07 * carbCal + 0.03 * fatCal);
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
        const candidateGrams = originalItem.grams || 100;
        return {
          ...item,
          chosenCandidateIndex: candidateIndex,
          currentGrams: candidateGrams,
          currentMacros: selectedCandidate.macros,
        };
      }
      return item;
    }));
  };

  const handlePortionChange = (itemIndex: number, portion: { grams: number; macros: any }) => {
    setSelectedItems(prev => prev.map((item, i) => 
      i === itemIndex 
        ? { ...item, currentGrams: portion.grams, currentMacros: portion.macros }
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
        const confidence = candidate?.confidence || originalItem.confidence || 0.8;
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
        confidence: candidate?.confidence || originalItem.confidence,
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
      <div className="h-screen bg-white flex flex-col">
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
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
        {/* Food Items List */}
        <div className="space-y-4 mb-6">
          {analysisResult.items.map((originalItem, index) => {
            const selectedItem = selectedItems[index];
            if (!selectedItem) return null;

            const currentCandidate = originalItem.candidates?.[selectedItem.chosenCandidateIndex];
            const displayItem = currentCandidate || originalItem;
            const baseGrams = originalItem.grams || 100;

            return (
              <div
                key={index}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedItem.include 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedItem.include}
                    onChange={() => handleItemToggle(index)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{displayItem.name}</h3>
                      <div className="flex items-center gap-2">
                        {displayItem.brand && (
                          <span className="text-xs text-gray-500">{displayItem.brand}</span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          (displayItem.confidence || 0.8) >= 0.8 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {Math.round((displayItem.confidence || 0.8) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Candidate Switcher */}
                    {originalItem.candidates && originalItem.candidates.length > 1 && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Alternative matches:
                        </label>
                        <div className="relative">
                          <select
                            value={selectedItem.chosenCandidateIndex}
                            onChange={(e) => handleCandidateChange(index, parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                          >
                            {originalItem.candidates.map((candidate, candIndex) => (
                              <option key={candIndex} value={candIndex}>
                                {candidate.name} {candidate.brand ? `(${candidate.brand})` : ''} - {Math.round(candidate.confidence * 100)}%
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Portion Controls */}
                    {selectedItem.include && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Portion size:
                        </label>
                        <PortionControls
                          baseServingGrams={baseGrams}
                          baseServingMacros={displayItem.macros || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }}
                          initialGrams={selectedItem.currentGrams}
                          onPortionChange={(portion) => handlePortionChange(index, portion)}
                        />
                        
                        {/* Current Macros Display */}
                        <div className="mt-2 flex justify-between text-xs text-gray-600">
                          <span>{selectedItem.currentMacros.kcal} cal</span>
                          <span>P: {selectedItem.currentMacros.protein_g}g</span>
                          <span>C: {selectedItem.currentMacros.carbs_g}g</span>
                          <span>F: {selectedItem.currentMacros.fat_g}g</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meal Slot Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal timing:
          </label>
          <select
            value={mealSlot}
            onChange={(e) => setMealSlot(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
            <option value="unknown">Unknown</option>
          </select>
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
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Totals for this meal</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{totals.kcal}</div>
              <div className="text-xs text-gray-500">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{totals.protein_g.toFixed(1)}g</div>
              <div className="text-xs text-gray-500">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{totals.carbs_g.toFixed(1)}g</div>
              <div className="text-xs text-gray-500">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{totals.fat_g.toFixed(1)}g</div>
              <div className="text-xs text-gray-500">Fat</div>
            </div>
          </div>

          {/* TEF and Net */}
          <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-200">
            <div className="text-gray-600">
              TEF (thermic effect): <span className="font-medium">{totals.tef_kcal} cal</span>
            </div>
            <div className="text-gray-900">
              Net calories: <span className="font-bold">{totals.net_kcal} cal</span>
            </div>
          </div>

          {/* How This Affects Today */}
          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              📊 How this affects today: Remaining ~1,200 kcal, ~75g protein (placeholder)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          
          {onEditManually && (
            <button
              onClick={onEditManually}
              className="flex items-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              <Edit3 size={16} />
              Edit Manually
            </button>
          )}
          
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