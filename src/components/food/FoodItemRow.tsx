import React from 'react';
import type { FoodItem } from '../../types/foodlog';

interface FoodItemRowProps {
  item: FoodItem;
  onItemChange: (id: string, updates: Partial<FoodItem>) => void;
  onRemove?: (id: string) => void;
}

export const FoodItemRow: React.FC<FoodItemRowProps> = ({ item, onItemChange, onRemove }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 border-b border-gray-200">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onItemChange(item.id, { name: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Food name for ${item.name}`}
        />
      </td>
      <td className="px-3 py-2 border-b border-gray-200">
        <input
          type="number"
          value={item.qty}
          onChange={(e) => onItemChange(item.id, { qty: parseFloat(e.target.value) || 0 })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
          step="0.1"
          aria-label={`Quantity for ${item.name}`}
        />
      </td>
      <td className="px-3 py-2 border-b border-gray-200">
        <input
          type="text"
          value={item.unit}
          onChange={(e) => onItemChange(item.id, { unit: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Unit for ${item.name}`}
        />
      </td>
      <td className="px-3 py-2 border-b border-gray-200 text-sm text-center">
        {item.kcal}
      </td>
      <td className="px-3 py-2 border-b border-gray-200 text-sm text-center">
        {item.protein}
      </td>
      <td className="px-3 py-2 border-b border-gray-200 text-sm text-center">
        {item.carbs}
      </td>
      <td className="px-3 py-2 border-b border-gray-200 text-sm text-center">
        {item.fat}
      </td>
      <td className="px-3 py-2 border-b border-gray-200 text-sm text-center">
        <span className={`px-2 py-1 rounded-full text-xs ${
          item.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
          item.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {(item.confidence * 100).toFixed(0)}%
        </span>
      </td>
      {onRemove && (
        <td className="px-3 py-2 border-b border-gray-200 text-center">
          <button
            onClick={() => onRemove(item.id)}
            className="text-red-500 hover:text-red-700 text-sm"
            aria-label={`Remove ${item.name}`}
          >
            ×
          </button>
        </td>
      )}
    </tr>
  );
};