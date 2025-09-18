import React from 'react';
import { Zap, Apple, TrendingDown, Edit3, Save, X } from 'lucide-react';
import { MacroWheel } from './MacroWheel';
import { EnergyData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';
import { setMacroOverrides } from '../../lib/macros';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface EnergySectionProps {
  energyData?: EnergyData;
}

export const EnergySection: React.FC<EnergySectionProps> = ({ energyData }) => {
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [macroOverrides, setMacroOverrides] = React.useState<{
    protein_g?: number;
    fat_g?: number;
    carb_g?: number;
  } | null>(null);
  const [editForm, setEditForm] = React.useState({
    protein_g: 0,
    fat_g: 0,
    carb_g: 0
  });

  // Fetch user's macro overrides on mount
  React.useEffect(() => {
    const fetchOverrides = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_metrics')
          .select('protein_g, carbs_g, fat_g')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching macro overrides:', error);
          return;
        }

        if (data && (data.protein_g || data.carbs_g || data.fat_g)) {
          setMacroOverrides({
            protein_g: data.protein_g,
            fat_g: data.fat_g,
            carb_g: data.carbs_g
          });
        }
      } catch (error) {
        console.error('Error in fetchOverrides:', error);
      }
    };

    fetchOverrides();
  }, []);

  // Use provided data or fallback to defaults
  const calories = energyData?.calories || 0;
  const tdee = energyData?.tdee || 2200;
  const deficit = tdee - calories;
  
  // Use overrides if they exist, otherwise fall back to calculated values
  const protein = macroOverrides?.protein_g ?? energyData?.protein_g ?? 0;
  const carbs = macroOverrides?.carb_g ?? energyData?.carb_g ?? 0;
  const fat = macroOverrides?.fat_g ?? energyData?.fat_g ?? 0;

  // Use provided data or create default structure
  const displayEnergyData: EnergyData = energyData || {
    date: '2024-01-21',
    calories: calories,
    protein_g: protein,
    fat_g: fat,
    carb_g: carbs,
    salt_g: 2.3,
    water_l: 3.2,
    first_meal_time: '08:30',
    last_meal_time: '20:15',
    tdee: tdee,
    bmr: 1850
  };

  const handleOpenEditModal = () => {
    // Pre-populate form with current values (overrides or calculated)
    setEditForm({
      protein_g: protein,
      fat_g: fat,
      carb_g: carbs
    });
    setShowEditModal(true);
  };

  const handleSaveMacros = async () => {
    setIsSaving(true);
    try {
      await setMacroOverrides(editForm.protein_g, editForm.fat_g, editForm.carb_g);
      
      // Update local state immediately
      setMacroOverrides({
        protein_g: editForm.protein_g,
        fat_g: editForm.fat_g,
        carb_g: editForm.carb_g
      });
      
      setShowEditModal(false);
      toast.success('Macro targets updated successfully!');
    } catch (error) {
      console.error('Error saving macro overrides:', error);
      toast.error('Failed to save macro targets. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const condensedContent = (
    <div className="text-center p-2">
      {/* Calories vs TDEE */}
      <div className="mb-3 sm:mb-4">
        <div className="text-xl sm:text-2xl font-bold text-white mb-1">
          {calories > 0 ? calories.toLocaleString() : '0'}
        </div>
        <p className="text-xs sm:text-sm text-gray-400">calories consumed</p>
        {calories > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-green-400 mt-1">
            <TrendingDown size={12} />
            <span>{deficit > 0 ? `${deficit} deficit` : `${Math.abs(deficit)} surplus`}</span>
          </div>
        )}
      </div>
      
      {/* Quick macro summary */}
      {calories > 0 ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs">
          <div className="text-center">
            <div className="text-white font-medium text-xs sm:text-sm">{protein.toFixed(0)}g</div>
            <div className="text-red-400">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium text-xs sm:text-sm">{carbs.toFixed(0)}g</div>
            <div className="text-blue-400">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium text-xs sm:text-sm">{fat.toFixed(0)}g</div>
            <div className="text-yellow-400">Fat</div>
          </div>
        </div>
      ) : (
        <div className="text-center p-2">
          <p className="text-gray-400 text-xs sm:text-sm">No food logged today</p>
          <p className="text-gray-500 text-xs">Start logging to see your macros</p>
        </div>
      )}
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {/* Macro Wheel Component */}
      <div className="mt-4">
        <MacroWheel data={displayEnergyData} />
      </div>
      
      {/* Additional metrics */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Hydration</span>
          <span className="text-blue-400">{displayEnergyData.water_l}L</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Fasting window</span>
          <span className="text-purple-400">12h 15m</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Sodium</span>
          <span className="text-yellow-400">{displayEnergyData.salt_g}g</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <CollapsibleTile
        title="Energy"
        icon={Zap}
        iconColor="text-green-400"
        hoverColor="border-green-600"
        condensedContent={condensedContent}
        className=""
        headerAction={
          <button
            onClick={handleOpenEditModal}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            title="Edit macro targets"
          >
            <Edit3 size={16} className="text-gray-400 hover:text-white" />
          </button>
        }
      >
        {fullContent}
      </CollapsibleTile>

      {/* Edit Macros Modal */}
      {showEditModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Macro Targets</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Protein (grams)
                </label>
                <input
                  type="number"
                  value={editForm.protein_g}
                  onChange={(e) => setEditForm(prev => ({ ...prev, protein_g: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="500"
                />
              </div>
              <p className="text-gray-600 text-sm mt-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fat (grams)
                </label>
                <input
                  type="number"
                  value={editForm.fat_g}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fat_g: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="300"
                />
              </div>
                Customize your daily macro targets (grams)
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carbs (grams)
                </label>
                <input
                  type="number"
                  value={editForm.carb_g}
                  onChange={(e) => setEditForm(prev => ({ ...prev, carb_g: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="800"
                />
              </div>
              </p>
              {macroOverrides && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    💡 You have custom macro targets set. These will replace the calculated values.
                  </p>
                </div>
              )}
            </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMacros}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Targets
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};