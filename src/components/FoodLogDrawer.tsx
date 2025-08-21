import React, { useState } from 'react';
import { X, Search, Plus, Minus, Edit3 } from 'lucide-react';
import { FoodEntry, FoodSearchResult, AnalysedFoodItem, FoodAnalysisResult } from '../types/food';
import { getTotalMacros } from '../utils/getTotalMacros';
import { FoodVerificationScreen } from './FoodVerificationScreen';
import { fetchFoodMacros } from '../lib/food';
import { trackFoodMacroLookup } from '../lib/analytics';

interface FoodLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFood: (entry: FoodEntry) => void;
  initialFoodData?: FoodAnalysisResult;
}

export const FoodLogDrawer: React.FC<FoodLogDrawerProps> = ({
  isOpen,
  onClose,
  onSaveFood,
  initialFoodData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLookingUpMacros, setIsLookingUpMacros] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    foodName: string;
    macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
    grams: number;
    patMessage?: string;
  } | null>(null);
  
  // State for multiple food items
  const [foodItems, setFoodItems] = useState<AnalysedFoodItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuantityIndex, setEditingQuantityIndex] = useState<number | null>(null);
  
  // State for single food entry (when adding manually)
  const [singleFoodEntry, setSingleFoodEntry] = useState({
    foodName: '',
    quantity: '100',
    unit: 'g',
    grams: 100,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    portionSize: 'M' as 'S' | 'M' | 'L'
  });

  // Initialize with analyzed food data
  React.useEffect(() => {
    if (initialFoodData && initialFoodData.foods.length > 0) {
      setFoodItems(initialFoodData.foods);
      setEditingIndex(null);
    } else {
      // Reset to single entry mode
      setFoodItems([]);
      setEditingIndex(null);
    }
  }, [initialFoodData]);

  // Portion size mappings
  const portionSizes = {
    S: { multiplier: 0.75, label: 'Small' },
    M: { multiplier: 1.0, label: 'Medium' },
    L: { multiplier: 1.25, label: 'Large' }
  };

  // Common unit conversions (simplified)
  const unitConversions: { [key: string]: number } = {
    'g': 1,
    'grams': 1,
    'oz': 28.35,
    'ounces': 28.35,
    'cup': 240, // varies by food, this is a rough average
    'cups': 240,
    'piece': 100, // default assumption
    'pieces': 100,
    'slice': 30,
    'slices': 30,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5
  };

  // Function to lookup macros using OpenAI
  const lookupMacros = async (foodName: string, source: 'manual' | 'camera' = 'manual') => {
    if (typeof foodName !== 'string' || !foodName.trim()) return;

    setIsLookingUpMacros(true);
    
    try {
      const user = await getSupabase().auth.getUser();
      if (user.data.user) {
        trackFoodMacroLookup(user.data.user.id, foodName, source);
      }
        
        console.log("[macros:req]", { foodName: foodName.trim() });
        const res = await fetchFoodMacros(foodName.trim());
        console.log("[macros:res]", res);
        
        if (!res.ok) {
          console.error('fetchFoodMacros error:', res.error);
          // Show verification screen with error message
          setVerificationData({
            foodName: foodName.trim(),
            macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            grams: 100,
            patMessage: res.error || "I'm having trouble right now. Please enter the nutrition information manually."
          });
          setShowVerificationScreen(true);
          return;
        }
        
        const macros = res.macros!;
        
        // Show verification screen with LLM results
        setVerificationData({
          foodName: foodName.trim(),
          macros: {
            kcal: macros.calories,
            protein_g: macros.protein_g,
            carbs_g: macros.carbs_g,
            fat_g: macros.fat_g
          },
          grams: 100,
          patMessage: `I found nutrition information for "${foodName.trim()}." Please review and edit if needed before saving.`
        });
        setShowVerificationScreen(true);
      
    } catch (error) {
      console.error('Error looking up macros:', error);
      
      // Fallback to manual entry
      setVerificationData({
        foodName: foodName.trim(),
        macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        grams: 100,
        patMessage: "I'm having trouble right now. Please enter the nutrition information manually."
      });
      setShowVerificationScreen(true);
    } finally {
      setIsLookingUpMacros(false);
    }
  };

  // Calculate total macros for multiple items
  const totalMacros = getTotalMacros(foodItems);

  const updateFoodItem = (index: number, updates: Partial<AnalysedFoodItem>) => {
    setFoodItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const updateFoodItemPortionSize = (index: number, portionSize: 'S' | 'M' | 'L') => {
    const item = foodItems[index];
    if (!item) return;
    
    // Calculate base grams (assuming current is 'M')
    const currentMultiplier = portionSizes[item.portionSize || 'M'].multiplier;
    const baseGrams = Math.round(item.grams / currentMultiplier);
    const newGrams = Math.round(baseGrams * portionSizes[portionSize].multiplier);
    
    // Calculate macro multiplier
    const macroMultiplier = newGrams / item.grams;
    
    updateFoodItem(index, {
      grams: newGrams,
      portionSize: portionSize,
      macros: {
        kcal: Math.round(item.macros.kcal * macroMultiplier),
        protein: parseFloat((item.macros.protein * macroMultiplier).toFixed(1)),
        carbs: parseFloat((item.macros.carbs * macroMultiplier).toFixed(1)),
        fat: parseFloat((item.macros.fat * macroMultiplier).toFixed(1))
      }
    });
  };

  const updateFoodItemByUnit = (index: number, quantity: number, unit: string) => {
    const item = foodItems[index];
    if (!item) return;
    
    const gramsPerUnit = unitConversions[unit.toLowerCase()] || 1;
    const newGrams = Math.round(quantity * gramsPerUnit);
    
    // Calculate macro multiplier
    const macroMultiplier = newGrams / item.grams;
    
    updateFoodItem(index, {
      grams: newGrams,
      unit: unit,
      macros: {
        kcal: Math.round(item.macros.kcal * macroMultiplier),
        protein: parseFloat((item.macros.protein * macroMultiplier).toFixed(1)),
        carbs: parseFloat((item.macros.carbs * macroMultiplier).toFixed(1)),
        fat: parseFloat((item.macros.fat * macroMultiplier).toFixed(1))
      }
    });
  };

  const removeFoodItem = (index: number) => {
    setFoodItems(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      lookupMacros(searchQuery.trim(), 'manual');
      setSearchQuery('');
    }
  };

  const handleQuantityChange = (newQuantity: string) => {
    setSingleFoodEntry(prev => ({ ...prev, quantity: newQuantity }));
    const quantityNum = parseInt(newQuantity) || 0;
    
    if (singleFoodEntry.unit === 'g') {
      setSingleFoodEntry(prev => ({ ...prev, grams: quantityNum }));
    } else {
      // Convert other units to grams (simplified)
      const gramsPerUnit = singleFoodEntry.unit === 'oz' ? 28.35 : singleFoodEntry.unit === 'cup' ? 240 : 1;
      setSingleFoodEntry(prev => ({ ...prev, grams: Math.round(quantityNum * gramsPerUnit) }));
    }

    // Note: This logic is now handled in FoodVerificationScreen
  };

  const handlePortionChange = (size: 'S' | 'M' | 'L') => {
    setSingleFoodEntry(prev => ({ ...prev, portionSize: size }));
    const baseQuantity = parseInt(singleFoodEntry.quantity) || 100;
    const newGrams = Math.round(baseQuantity * portionSizes[size].multiplier);
    setSingleFoodEntry(prev => ({ ...prev, grams: newGrams }));

    // Note: This logic is now handled in FoodVerificationScreen
  };

  const handleVerificationConfirm = (entryData: Omit<FoodEntry, 'id' | 'createdAt'>) => {
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      ...entryData,
      createdAt: new Date().toISOString()
    };

    onSaveFood(entry);
    handleClose();
  };

  const handleVerificationCancel = () => {
    setShowVerificationScreen(false);
    setVerificationData(null);
  };

  const handleSaveMultipleEntries = () => {
    if (foodItems.length === 0) return;

    // Save each food item as a separate entry
    foodItems.forEach(item => {
      const entry: FoodEntry = {
        id: crypto.randomUUID(),
        foodName: item.name,
        grams: item.grams,
        sourceDb: 'AI Analysis',
        macros: item.macros,
        createdAt: new Date().toISOString(),
        confidence: item.confidence
      };
      onSaveFood(entry);
    });
    
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setSearchQuery('');
    setShowVerificationScreen(false);
    setVerificationData(null);
    setFoodItems([]);
    setEditingIndex(null);
    setSingleFoodEntry({
      foodName: '',
      quantity: '100',
      unit: 'g',
      grams: 100,
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      portionSize: 'M'
    });
    onClose();
  };

  const isMultiItemMode = foodItems.length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {isMultiItemMode ? 'Review Detected Foods' : 'Log Food'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Show verification screen if active */}
          {showVerificationScreen && verificationData ? (
            <FoodVerificationScreen
              initialFoodName={verificationData.foodName}
              initialMacros={verificationData.macros}
              initialGrams={verificationData.grams}
              patMessage={verificationData.patMessage}
              onConfirm={handleVerificationConfirm}
              onCancel={handleVerificationCancel}
            />
          ) : (
            <>
          {/* Multi-Item Mode: Display analyzed foods */}
          {isMultiItemMode ? (
            <>
              {/* Total Macros Summary */}
              {totalMacros && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-medium mb-3">Total Nutrition</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-white">{totalMacros.kcal}</div>
                      <div className="text-gray-400 text-xs">Calories</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-red-400">{totalMacros.protein.toFixed(1)}g</div>
                      <div className="text-gray-400 text-xs">Protein</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-400">{totalMacros.carbs.toFixed(1)}g</div>
                      <div className="text-gray-400 text-xs">Carbs</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-400">{totalMacros.fat.toFixed(1)}g</div>
                      <div className="text-gray-400 text-xs">Fat</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Food Items */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Detected Foods</h3>
                {foodItems.map((item, index) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{(item.confidence * 100).toFixed(0)}% confident</span>
                        <button
                          onClick={() => removeFoodItem(index)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Quantity Adjustment */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-300">Quantity</label>
                        <button
                          onClick={() => setEditingQuantityIndex(editingQuantityIndex === index ? null : index)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Edit3 size={14} className="text-gray-400" />
                        </button>
                      </div>
                      
                      {editingQuantityIndex === index ? (
                        <div className="space-y-3">
                          {/* Portion Size Buttons */}
                          <div>
                            <label key="portion-size-label" className="block text-xs text-gray-400 mb-2">Portion Size</label>
                            <div className="flex gap-2">
                              {(['S', 'M', 'L'] as const).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => updateFoodItemPortionSize(index, size)}
                                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                                    (item.portionSize || 'M') === size
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {portionSizes[size].label}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Unit-based Input */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">Or specify amount</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="Amount"
                                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onBlur={(e) => {
                                  const quantity = parseFloat(e.target.value);
                                  if (quantity && item.unit) {
                                    updateFoodItemByUnit(index, quantity, item.unit);
                                  }
                                }}
                              />
                              <select
                                value={item.unit || 'grams'}
                                onChange={(e) => updateFoodItem(index, { unit: e.target.value })}
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="grams">grams</option>
                                <option value="oz">oz</option>
                                <option value="cup">cup</option>
                                <option value="piece">piece</option>
                                <option value="slice">slice</option>
                                <option value="tbsp">tbsp</option>
                              </select>
                            </div>
                          </div>
                          
                          {/* Direct Grams Input */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">Exact grams</label>
                            <input
                              type="number"
                              value={item.grams}
                              onChange={(e) => {
                                const newGrams = parseInt(e.target.value) || 0;
                                const multiplier = newGrams / item.grams;
                                updateFoodItem(index, {
                                  grams: newGrams,
                                  macros: {
                                    kcal: Math.round(item.macros.kcal * multiplier),
                                    protein: parseFloat((item.macros.protein * multiplier).toFixed(1)),
                                    carbs: parseFloat((item.macros.carbs * multiplier).toFixed(1)),
                                    fat: parseFloat((item.macros.fat * multiplier).toFixed(1))
                                  }
                                });
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{item.grams}g</span>
                          {item.portionSize && (
                            <span className="text-gray-400 text-sm">
                              ({portionSizes[item.portionSize].label})
                            </span>
                          )}
                          {item.unit && item.unit !== 'grams' && (
                            <span className="text-gray-400 text-sm">
                              ≈ {Math.round(item.grams / (unitConversions[item.unit] || 1) * 10) / 10} {item.unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Macros Display/Edit */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-white font-medium">{item.macros.kcal}</div>
                        <div className="text-gray-400">Cal</div>
                      </div>
                      <div className="text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={item.macros.protein}
                          onChange={(e) => updateFoodItem(index, {
                            macros: { ...item.macros, protein: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <div className="text-red-400 mt-1">Protein</div>
                      </div>
                      <div className="text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={item.macros.carbs}
                          onChange={(e) => updateFoodItem(index, {
                            macros: { ...item.macros, carbs: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="text-blue-400 mt-1">Carbs</div>
                      </div>
                      <div className="text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={item.macros.fat}
                          onChange={(e) => updateFoodItem(index, {
                            macros: { ...item.macros, fat: parseFloat(e.target.value) || 0 }
                          })}
                          className="w-full px-1 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        />
                        <div className="text-yellow-400 mt-1">Fat</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons for Multi-Item Mode */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveMultipleEntries}
                  disabled={foodItems.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Save and Log
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Single Item Mode: Original manual entry form */}
              {/* Food Search with AI Lookup */}
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Food Name
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter food name (e.g., chicken breast, apple, rice)"
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isFetching}
                      disabled={isFetching}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isFetching}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isFetching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Get Nutrition Info
                    </>
                  )}
                </button>
              </form>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                  <div>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      I'll help you find nutrition information for any food! Just type the name and I'll look up the macros for you.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
            </>
          )}
        </div>
      </div>
    </>
  );
};