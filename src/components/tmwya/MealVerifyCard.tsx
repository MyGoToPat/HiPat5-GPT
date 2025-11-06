import React from "react";
import { getSupabase } from "../../lib/supabase";
import type { MacroItem, MealTotals, TefBreakdown, TdeeResult } from "../../agents/shared/nutrition/types";
import { portionResolver } from "../../agents/shared/nutrition/portionResolver";
import { macroLookup } from "../../agents/shared/nutrition/macroLookup";
import { computeTEF } from "../../agents/tmwya/tef";

type Props = {
  view: {
    rows: Array<{ name:string; quantity:number|null; unit:string|null; calories:number; protein_g:number; carbs_g:number; fat_g:number; fiber_g:number; editable:boolean }>;
    totals: MealTotals;
    tef: { kcal:number };
    tdee: { target_kcal:number; remaining_kcal:number; remaining_percentage:number };
    meal_slot: "breakfast"|"lunch"|"dinner"|"snack"|null;
    eaten_at: string|null;
    actions: Array<"CONFIRM_LOG"|"EDIT_ITEMS"|"CANCEL">;
    warnings?: Array<{ type:"low_confidence"|"missing_portion"; item?:string; message:string }>;
  };
  items: MacroItem[];
  totals: MealTotals;
  tef: TefBreakdown;
  tdee: TdeeResult;
  
  // Live dashboard data (optional - falls back to view.tdee if not provided)
  liveDashboard?: {
    target_kcal: number;      // From Dashboard's macro calculation
    consumed_today: number;   // From Dashboard's meal sum (TODAY only, before this meal)
  };
  
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onUpdate?: (updatedView: any) => void;
};

export default function MealVerifyCard({ view, liveDashboard, onConfirm, onCancel, onUpdate }: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedRows, setEditedRows] = React.useState(view.rows);
  const [userId, setUserId] = React.useState<string | undefined>(undefined);
  
  // Get userId on mount
  React.useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);
  
  // Format date as MM/DD/YY HH:MM AM/PM
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "now";
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${month}/${day}/${year}, ${displayHours}:${minutes} ${ampm}`;
  };
  
  // Use live dashboard data if available, otherwise fall back to view.tdee
  const targetKcal = liveDashboard?.target_kcal ?? view.tdee.target_kcal;
  const consumedToday = liveDashboard?.consumed_today ?? 0;
  
  // Calculate total with TEF for THIS meal
  const totalWithTEF = view.totals.calories + view.tef.kcal;
  
  // LIVE remaining calculation: Target - (Already consumed today + This meal with TEF)
  const afterLogging = consumedToday + totalWithTEF;
  const remaining = targetKcal - afterLogging;
  
  console.log('[MealVerifyCard] Live data:', { 
    targetKcal, 
    consumedToday, 
    thisMeal: totalWithTEF, 
    afterLogging, 
    remaining,
    hasLiveData: !!liveDashboard 
  });
  
  return (
    <div className="w-full max-w-2xl rounded-2xl bg-neutral-900/70 border border-neutral-800 shadow-lg p-4 text-neutral-100">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm uppercase tracking-wide text-neutral-400">Verify Meal</div>
          <div className="text-lg font-semibold">{formatDate(view.eaten_at)}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-neutral-400">Target Calories</div>
          <div className="text-xl font-bold">{targetKcal} kcal</div>
          
          {/* Live BEFORE/AFTER breakdown */}
          {liveDashboard && (
            <div className="text-xs text-neutral-400 mt-2 space-y-0.5">
              <div>Before: <span className="text-neutral-200">{consumedToday} kcal</span></div>
              <div>This meal: <span className="text-blue-400">+{totalWithTEF} kcal</span></div>
              <div className="border-t border-neutral-700 pt-0.5">
                After: <span className="text-neutral-100 font-semibold">{afterLogging} kcal</span>
              </div>
            </div>
          )}
          
          {/* Fallback for non-live data */}
          {!liveDashboard && (
            <div className="text-xs text-neutral-500 mt-1">Total (incl. TEF): {totalWithTEF} kcal</div>
          )}
          
          <div className="text-sm mt-2">
            Remaining: <span className={`font-semibold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {remaining} kcal
            </span>
          </div>
        </div>
      </div>

      {view.warnings?.length ? (
        <div className="mb-3 rounded-lg border border-yellow-600/40 bg-yellow-900/20 p-2 text-yellow-200 text-sm">
          {view.warnings.map((w, i) => (
            <div key={i}>• {w.message}{w.item ? ` (${w.item})` : ""}</div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl overflow-hidden border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-right px-3 py-2">Unit</th>
              <th className="text-right px-3 py-2">Cals</th>
              <th className="text-right px-3 py-2">P</th>
              <th className="text-right px-3 py-2">C</th>
              <th className="text-right px-3 py-2">F</th>
              <th className="text-right px-3 py-2">Fiber</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r, i) => (
              <tr key={i} className="odd:bg-neutral-900/30">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right">{r.quantity ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.unit ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.calories}</td>
                <td className="px-3 py-2 text-right">{r.protein_g}</td>
                <td className="px-3 py-2 text-right">{r.carbs_g}</td>
                <td className="px-3 py-2 text-right">{r.fat_g}</td>
                <td className="px-3 py-2 text-right">{r.fiber_g}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-neutral-800/60">
            <tr>
              <td className="px-3 py-2 font-semibold" colSpan={3}>Totals</td>
              <td className="px-3 py-2 text-right font-semibold">{view.totals.calories}</td>
              <td className="px-3 py-2 text-right font-semibold">{view.totals.protein_g}</td>
              <td className="px-3 py-2 text-right font-semibold">{view.totals.carbs_g}</td>
              <td className="px-3 py-2 text-right font-semibold">{view.totals.fat_g}</td>
              <td className="px-3 py-2 text-right font-semibold">{view.totals.fiber_g}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3">
        {/* Bottom summary: Meal TEF + Total */}
        <div className="text-sm text-neutral-300 mb-3 px-3 py-2 bg-neutral-800/40 rounded-lg">
          <span className="font-semibold">Meal:</span> TEF: {view.tef.kcal} kcal + Total: {view.totals.calories} kcal = {totalWithTEF} kcal
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800">Cancel</button>
          {view.actions.includes('EDIT_ITEMS') && (
            <button onClick={() => setIsEditing(true)} className="px-3 py-2 rounded-lg border border-blue-600 hover:bg-blue-900/30 text-blue-400">Edit</button>
          )}
          {view.actions.includes('CONFIRM_LOG') && (
            <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Confirm log</button>
          )}
        </div>
      </div>

      {/* Edit Sheet Modal */}
      {isEditing && (
        <EditMealSheet
          initialRows={editedRows}
          onClose={() => setIsEditing(false)}
          onApply={async (rows) => {
            try {
              // Recompute macros client-side
              
              const items = rows.map(r => ({ name: r.name, amount: r.quantity, unit: r.unit }));
              const portioned = portionResolver(items);
              const estimate = await macroLookup(portioned, userId);
              const tef = computeTEF(estimate.totals);
              
              // Update rows with recomputed macros
              const updatedRows = estimate.items.map((i: any) => ({
                name: i.name,
                quantity: i.quantity ?? null,
                unit: i.unit ?? null,
                calories: i.calories ?? 0,
                protein_g: i.protein_g ?? 0,
                carbs_g: i.carbs_g ?? 0,
                fat_g: i.fat_g ?? 0,
                fiber_g: i.fiber_g ?? 0,
                editable: true
              }));
              
              setEditedRows(updatedRows);
              
              // Update parent view
              if (onUpdate) {
                onUpdate({
                  ...view,
                  rows: updatedRows,
                  totals: estimate.totals,
                  tef: { kcal: tef.kcal }
                });
              }
              
              setIsEditing(false);
            } catch (e) {
              console.error('[EditMealSheet] Failed to recompute macros:', e);
            }
          }}
        />
      )}
    </div>
  );
}

// Edit Sheet Component
function EditMealSheet({ initialRows, onApply, onClose }: {
  initialRows: Array<{ name:string; quantity:number|null; unit:string|null }>;
  onApply: (rows: Array<{ name:string; quantity:number|null; unit:string|null }>) => Promise<void>;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState(initialRows);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-neutral-900 text-neutral-100 rounded-t-2xl sm:rounded-2xl border border-neutral-800 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm uppercase tracking-wide text-neutral-400">Edit Items</div>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-neutral-800">✕</button>
        </div>
        <div className="rounded-xl overflow-hidden border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800/60">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-neutral-900/30">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-right text-neutral-100"
                      value={r.quantity ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        setRows(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: v } : x));
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <select
                      className="w-28 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                      value={r.unit ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : e.target.value;
                        setRows(prev => prev.map((x, idx) => idx === i ? { ...x, unit: v } : x));
                      }}
                    >
                      <option value="">—</option>
                      <option value="piece">piece</option>
                      <option value="cup">cup</option>
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="ml">ml</option>
                      <option value="slice">slice</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800">Cancel</button>
          <button onClick={() => onApply(rows)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Apply</button>
        </div>
      </div>
    </div>
  );
}

