import React from 'react';
import {
  Coffee,
  Sun,
  Moon,
  Cookie,
  Utensils,
  Plus,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { ExtractedMeal, ExtractedFoodItem } from '../../types';
import { FoodItemEditor } from './FoodItemEditor';

interface ExtractedMealCardProps {
  meal: ExtractedMeal;
  mealIndex: number;
  onUpdateItem: (mealIndex: number, itemIndex: number, updated: ExtractedFoodItem) => void;
  onRemoveItem: (mealIndex: number, itemIndex: number) => void;
  onAddItem: (mealIndex: number) => void;
}

export const ExtractedMealCard: React.FC<ExtractedMealCardProps> = ({
  meal,
  mealIndex,
  onUpdateItem,
  onRemoveItem,
  onAddItem
}) => {
  const getMealHeader = (type: string) => {
    const t = type.toLowerCase();
    switch (t) {
      case 'breakfast':
        return {
          icon: Coffee,
          color: 'text-amber-700 bg-amber-100/80 border-amber-200',
          title: 'Breakfast'
        };
      case 'lunch':
        return {
          icon: Sun,
          color: 'text-orange-700 bg-orange-100/80 border-orange-200',
          title: 'Lunch'
        };
      case 'dinner':
        return {
          icon: Moon,
          color: 'text-indigo-700 bg-indigo-100/80 border-indigo-200',
          title: 'Dinner'
        };
      case 'snack':
        return {
          icon: Cookie,
          color: 'text-teal-700 bg-teal-100/80 border-teal-200',
          title: 'Snack & Tea'
        };
      default:
        return {
          icon: Utensils,
          color: 'text-slate-700 bg-slate-100 border-slate-200',
          title: 'Meal'
        };
    }
  };

  const { icon: MealIcon, color, title } = getMealHeader(meal.meal_type);

  const verifiedCount = meal.items.filter(it => it.portion_known && it.quantity_g && it.quantity_g > 0).length;
  const isComplete = verifiedCount === meal.items.length && meal.items.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5 transition-all">
      {/* Meal Group Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`p-2 rounded-xl border ${color} shadow-xs`}>
            <MealIcon className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-base font-bold text-slate-800">{title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{meal.items.length} {meal.items.length === 1 ? 'item' : 'items'}</span>
              <span>•</span>
              <span className={isComplete ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'text-amber-600 font-medium flex items-center gap-1'}>
                {isComplete ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    All weights verified
                  </>
                ) : (
                  <>
                    <Scale className="w-3 h-3" />
                    {meal.items.length - verifiedCount} need grams
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddItem(mealIndex)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Food Item</span>
        </button>
      </div>

      {/* List of Food Items */}
      <div className="space-y-3">
        {meal.items.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No items in this meal yet. Click "Add Food Item" above.
          </div>
        ) : (
          meal.items.map((item, idx) => (
            <FoodItemEditor
              key={idx}
              item={item}
              itemIndex={idx}
              mealIndex={mealIndex}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>
    </div>
  );
};
