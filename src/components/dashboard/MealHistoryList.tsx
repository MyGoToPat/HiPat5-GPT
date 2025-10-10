import React, { useState, useEffect } from 'react';
import { Trash2, Clock } from 'lucide-react';
import { getSupabase, getUserDayBoundaries } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface MealItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

interface Meal {
  id: string;
  ts: string;
  meal_slot: string;
  source: string;
  totals: {
    kcal: number;
    calories?: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  items: MealItem[];
}

interface MealHistoryListProps {
  userId: string;
  onMealDeleted?: () => void;
}

export const MealHistoryList: React.FC<MealHistoryListProps> = ({ userId, onMealDeleted }) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  useEffect(() => {
    loadMeals();
  }, [userId]);

  const loadMeals = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();

      // Get timezone-aware day boundaries (same as DashboardPage)
      const dayBoundaries = await getUserDayBoundaries(userId);

      if (!dayBoundaries) {
        console.error('Could not get day boundaries for user');
        setMeals([]);
        return;
      }

      console.log('Day boundaries:', dayBoundaries);

      // Query meal_logs within today's boundaries
      const { data: mealsData, error: mealsError } = await supabase
        .from('meal_logs')
        .select('id, ts, meal_slot, source, totals')
        .eq('user_id', userId)
        .gte('ts', dayBoundaries.day_start)
        .lte('ts', dayBoundaries.day_end)
        .order('ts', { ascending: false });

      if (mealsError) {
        console.error('Supabase error loading meal_logs:', mealsError);
        throw mealsError;
      }

      if (!mealsData || mealsData.length === 0) {
        console.log('No meals found for today');
        setMeals([]);
        return;
      }

      // Query all meal_items for these meals
      const mealIds = mealsData.map(m => m.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('meal_items')
        .select('id, meal_log_id, name, quantity, unit, energy_kcal, protein_g, fat_g, carbs_g, fiber_g')
        .in('meal_log_id', mealIds)
        .order('id', { ascending: true });

      if (itemsError) {
        console.error('Supabase error loading meal_items:', itemsError);
        throw itemsError;
      }

      // Group items by meal_log_id
      const itemsByMealId = (itemsData || []).reduce((acc, item) => {
        if (!acc[item.meal_log_id]) {
          acc[item.meal_log_id] = [];
        }
        acc[item.meal_log_id].push(item);
        return acc;
      }, {} as Record<string, MealItem[]>);

      // Combine meals with their items
      const mealsWithItems: Meal[] = mealsData.map(meal => ({
        ...meal,
        items: itemsByMealId[meal.id] || []
      }));

      console.log('Loaded meals for today:', mealsWithItems.length, 'meals');
      setMeals(mealsWithItems);
    } catch (error) {
      console.error('Error loading meals:', error);
      toast.error('Failed to load meal history');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!confirm('Delete this meal entry?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast.success('Meal deleted');
      setMeals(meals.filter(m => m.id !== mealId));
      onMealDeleted?.();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMealSlot = (slot: string) => {
    return slot.charAt(0).toUpperCase() + slot.slice(1);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Today's Meals</h3>
        <p className="text-slate-400 text-center py-8">No meals logged today</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Today's Meals</h3>
      <div className="space-y-3">
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">
                  {formatTime(meal.ts)}
                </span>
                <span className="text-sm px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                  {formatMealSlot(meal.meal_slot)}
                </span>
                <span className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded">
                  {meal.source}
                </span>
              </div>
              <button
                onClick={() => deleteMeal(meal.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete meal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Per-item breakdown */}
            {meal.items.length > 0 && (
              <div className="mb-3 space-y-2">
                {meal.items.map((item) => (
                  <div key={item.id} className="bg-slate-800/50 rounded px-3 py-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200 font-medium">{item.name}</span>
                      <span className="text-slate-400">{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>{Math.round(item.energy_kcal)} kcal</span>
                      <span className="text-red-300">{Math.round(item.protein_g)}P</span>
                      <span className="text-yellow-300">{Math.round(item.fat_g)}F</span>
                      <span className="text-blue-300">{Math.round(item.carbs_g)}C</span>
                      <span className="text-green-300">{Math.round(item.fiber_g)}Fib</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals row */}
            <div className="grid grid-cols-5 gap-2 text-sm border-t border-slate-600 pt-3">
              <div>
                <div className="text-slate-400 text-xs">Calories</div>
                <div className="text-white font-semibold">{Math.round(meal.totals.kcal || meal.totals.calories || 0)}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Protein</div>
                <div className="text-white font-semibold">{Math.round(meal.totals.protein_g)}g</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Fat</div>
                <div className="text-white font-semibold">{Math.round(meal.totals.fat_g)}g</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Carbs</div>
                <div className="text-white font-semibold">{Math.round(meal.totals.carbs_g)}g</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Fiber</div>
                <div className="text-white font-semibold">{Math.round(meal.totals.fiber_g || 0)}g</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
