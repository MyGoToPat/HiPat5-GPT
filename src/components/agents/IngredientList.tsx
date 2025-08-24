import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { Ingredient } from '../../types/shoplens';

interface IngredientListProps {
  ingredients: Ingredient[];
  className?: string;
}

export const IngredientList: React.FC<IngredientListProps> = ({ ingredients, className = '' }) => {
  const getRiskIcon = (riskLevel?: Ingredient['riskLevel']) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'medium':
        return <Info size={16} className="text-yellow-500" />;
      case 'low':
      default:
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  const getRiskColor = (riskLevel?: Ingredient['riskLevel']) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {ingredients.map((ingredient, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${getRiskColor(ingredient.riskLevel)} transition-all hover:shadow-sm`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getRiskIcon(ingredient.riskLevel)}
                <h3 className="font-medium text-gray-900">{ingredient.name}</h3>
                {ingredient.amount && ingredient.unit && (
                  <span className="text-sm text-gray-600">
                    {ingredient.amount}{ingredient.unit}
                  </span>
                )}
              </div>
              
              {ingredient.notes && (
                <p className="text-sm text-gray-600 mt-1">{ingredient.notes}</p>
              )}
            </div>
            
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              ingredient.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
              ingredient.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {ingredient.riskLevel || 'low'} risk
            </span>
          </div>
        </div>
      ))}
      
      {ingredients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Info size={32} className="mx-auto mb-2 text-gray-400" />
          <p>No ingredients detected</p>
        </div>
      )}
    </div>
  );
};