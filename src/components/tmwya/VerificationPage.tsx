import React, { useState, useEffect } from 'react';
import { Check, X, Edit3 } from 'lucide-react';

interface MealItem {
  description: string;
  brand?: string;
  qty: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  source?: string;
}

interface PendingMeal {
  items: MealItem[];
  inferredTimestamp?: Date;
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  };
}

interface VerificationPageProps {
  pendingMeal: PendingMeal;
  onEdit: (itemIndex: number) => void;
  onCancel: () => void;
  onLog: (editedMeal: PendingMeal) => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  pendingMeal,
  onEdit,
  onCancel,
  onLog
}) => {
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [editedItems, setEditedItems] = useState<MealItem[]>(pendingMeal.items);
  const [liveTotals, setLiveTotals] = useState(pendingMeal.totals);

  // Recalculate totals when items change
  useEffect(() => {
    const newTotals = editedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein_g: acc.protein_g + (item.protein_g || 0),
        carbs_g: acc.carbs_g + (item.carbs_g || 0),
        fat_g: acc.fat_g + (item.fat_g || 0),
        fiber_g: acc.fiber_g + (item.fiber_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    );
    setLiveTotals(newTotals);
  }, [editedItems]);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Verify Your Meal</h2>
        <p className="text-gray-600 text-sm">
          I've parsed your meal. Please review the items and make any adjustments before logging.
        </p>
      </div>

      {/* Meal Slot Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meal Type
        </label>
        <select
          value={mealSlot}
          onChange={(e) => setMealSlot(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      {/* Meal Items */}
      <div className="space-y-3 mb-6">
        {pendingMeal.items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {item.qty} {item.unit} {item.description}
                  {item.brand && <span className="text-gray-500 ml-1">({item.brand})</span>}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const newQty = parseFloat(e.target.value) || 1;
                      const newItems = [...editedItems];
                      // Scale nutritional values based on quantity change
                      const scaleFactor = newQty / item.qty;
                      newItems[index] = {
                        ...item,
                        qty: newQty,
                        calories: Math.round(item.calories * scaleFactor),
                        protein_g: Math.round(item.protein_g * scaleFactor * 10) / 10,
                        carbs_g: Math.round(item.carbs_g * scaleFactor * 10) / 10,
                        fat_g: Math.round(item.fat_g * scaleFactor * 10) / 10,
                        fiber_g: item.fiber_g ? Math.round(item.fiber_g * scaleFactor * 10) / 10 : undefined,
                      };
                      setEditedItems(newItems);
                    }}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded mr-2"
                    min="0.1"
                    step="0.1"
                  />
                  {item.unit} • {item.calories} kcal • {item.protein_g}g protein • {item.carbs_g}g carbs • {item.fat_g}g fat
                  {item.fiber_g && ` • ${item.fiber_g}g fiber`}
                </div>
                {item.source && (
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {item.source}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const newItems = editedItems.filter((_, i) => i !== index);
                  setEditedItems(newItems);
                }}
                className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove item"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Meal Totals</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Calories:</span>
            <span className="font-semibold ml-2">{Math.round(liveTotals.calories)} kcal</span>
          </div>
          <div>
            <span className="text-gray-600">Protein:</span>
            <span className="font-semibold ml-2">{Math.round(liveTotals.protein_g * 10) / 10}g</span>
          </div>
          <div>
            <span className="text-gray-600">Carbs:</span>
            <span className="font-semibold ml-2">{Math.round(liveTotals.carbs_g * 10) / 10}g</span>
          </div>
          <div>
            <span className="text-gray-600">Fat:</span>
            <span className="font-semibold ml-2">{Math.round(liveTotals.fat_g * 10) / 10}g</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <X size={18} />
          Cancel
        </button>
        <button
          onClick={async () => {
            try {
              const editedMeal = {
                items: editedItems,
                inferredTimestamp: pendingMeal.inferredTimestamp,
                totals: liveTotals
              };
              await onLog(editedMeal);
              console.info('[tmwya] log → persisted', { count: editedItems.length });
            } catch (e) {
              console.error('[tmwya] log → failed', e);
              // Error handling is done in the parent component
            }
          }}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Check size={18} />
          Log Meal
        </button>
      </div>
    </div>
  );
};
