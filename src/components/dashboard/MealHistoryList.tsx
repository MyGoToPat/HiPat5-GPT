import React, { useState, useEffect } from 'react';
import { Trash2, Clock } from 'lucide-react';
import { getSupabase, getUserDayBoundaries } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Meal {
  id: string;
  eaten_at: string;
  meal_slot: string;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  items?: Array<{
    name: string;
    qty: number;
    unit: string;
  }>;
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

      // Query for all meals within today's boundaries (timezone-aware)
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('id, eaten_at, meal_slot, totals')
        .eq('user_id', userId)
        .gte('eaten_at', dayBoundaries.day_start)
        .lte('eaten_at', dayBoundaries.day_end)
        .order('eaten_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading meals:', error);
        throw error;
      }

      console.log('Loaded meals for today:', mealsData?.length || 0, 'meals');
      setMeals(mealsData || []);
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
        .from('meals')
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">
                    {formatTime(meal.eaten_at)}
                  </span>
                  <span className="text-sm px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                    {formatMealSlot(meal.meal_slot)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400 text-xs">Calories</div>
                    <div className="text-white font-semibold">{Math.round(meal.totals.kcal)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Protein</div>
                    <div className="text-white font-semibold">{Math.round(meal.totals.protein_g)}g</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Carbs</div>
                    <div className="text-white font-semibold">{Math.round(meal.totals.carbs_g)}g</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Fat</div>
                    <div className="text-white font-semibold">{Math.round(meal.totals.fat_g)}g</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteMeal(meal.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete meal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
