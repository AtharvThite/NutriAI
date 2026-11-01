import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calculator,
  BookmarkPlus,
  Flame,
  Wheat,
  Dumbbell,
  Droplet,
  PieChart as PieIcon,
  BarChart3,
  Check,
  AlertCircle,
  HelpCircle,
  Clock,
  UtensilsCrossed
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { FoodItem, MealItemInput, NutritionAnalysis, Meal } from '../types';

export const NutritionChecker: React.FC = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Meal builder state
  const [selectedItems, setSelectedItems] = useState<MealItemInput[]>([
    { food_code: 'ASC001', food_name: 'Hot tea (Garam Chai)', quantity_g: 150, servings_unit: 'tea cup' }
  ]);

  // Calculation and Meal saving state
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [mealName, setMealName] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Meal history
  const [savedMeals, setSavedMeals] = useState<Meal[]>([]);
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');

  // Load initial search and meal history
  useEffect(() => {
    loadSavedMeals();
    // Default search for common Indian items
    handleSearch('dal');
  }, []);

  // Run calculation when selected items change
  useEffect(() => {
    if (selectedItems.length > 0) {
      calculateNutrition();
    } else {
      setAnalysis(null);
    }
  }, [selectedItems]);

  const loadSavedMeals = async () => {
    try {
      const meals = await api.getMeals(20);
      setSavedMeals(meals);
    } catch (err) {
      console.error('Failed to load saved meals:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await api.searchFoods(query, 15);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const addItemToMeal = (food: FoodItem) => {
    const exists = selectedItems.find((i) => i.food_code === food.food_code);
    if (exists) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.food_code === food.food_code ? { ...i, quantity_g: i.quantity_g + 50 } : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          food_code: food.food_code,
          food_name: food.food_name,
          quantity_g: 100,
          servings_unit: food.servings_unit
        }
      ]);
    }
  };

  const removeItemFromMeal = (foodCode: string) => {
    setSelectedItems(selectedItems.filter((i) => i.food_code !== foodCode));
  };

  const updateQuantity = (foodCode: string, qty: number) => {
    const validQty = Math.max(1, qty || 0);
    setSelectedItems(
      selectedItems.map((i) => (i.food_code === foodCode ? { ...i, quantity_g: validQty } : i))
    );
  };

  const calculateNutrition = async () => {
    if (selectedItems.length === 0) return;
    try {
      setCalculating(true);
      const res = await api.analyzeNutrition(selectedItems);
      setAnalysis(res);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim() || selectedItems.length === 0) return;
    try {
      setSavingMeal(true);
      await api.createMeal(mealName.trim(), selectedItems);
      setSaveSuccess(true);
      setMealName('');
      loadSavedMeals();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving meal:', err);
    } finally {
      setSavingMeal(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await api.deleteMeal(mealId);
      setSavedMeals(savedMeals.filter((m) => m.meal_id !== mealId));
    } catch (err) {
      console.error('Error deleting meal:', err);
    }
  };

  // Macro chart colors
  const MACRO_COLORS = ['#3b82f6', '#10b981', '#f59e0b']; // Carbs (Blue), Protein (Green), Fat (Amber)

  const macroPieData = analysis
    ? [
        { name: 'Carbohydrates', value: analysis.macronutrient_ratios.carb_energy_pct },
        { name: 'Protein', value: analysis.macronutrient_ratios.protein_energy_pct },
        { name: 'Fats', value: analysis.macronutrient_ratios.fat_energy_pct }
      ]
    : [];

  const micronutrientBarData = analysis
    ? [
        { name: 'Fiber (g)', value: analysis.total_nutrients?.fibre_g || 0 },
        { name: 'Iron (mg)', value: analysis.total_nutrients?.iron_mg || 0 },
        { name: 'Calcium (x10 mg)', value: (analysis.total_nutrients?.calcium_mg || 0) / 10 },
        { name: 'Zinc (mg)', value: analysis.total_nutrients?.zinc_mg || 0 },
        { name: 'Vit C (mg)', value: analysis.total_nutrients?.vitc_mg || 0 }
      ]
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header with Tab switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Indian Food Nutrition Checker
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic nutrient calculation engine backed by 1,014 Anuvaad laboratory records.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'builder'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Meal Builder & Calculator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Saved Meal History ({savedMeals.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Food Search & Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Search Input Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                Search Indian Foods
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="e.g. roti, dal tadka, paneer, idli, biryani..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              <p className="text-[11px] text-slate-400">
                1,014 verified regional recipes & standard preparations available.
              </p>
            </div>

            {/* Search Results List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col max-h-[500px]">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>Search Results {searchResults.length > 0 && `(${searchResults.length})`}</span>
                <span className="text-[11px] text-slate-400 font-normal">Nutrients per 100g</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {searching ? (
                  <div className="py-12 text-center text-sm text-slate-400">Searching Anuvaad database...</div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400 px-4">
                    No matching food items found for "{searchQuery}". Try searching for dal, roti, curry, or paneer.
                  </div>
                ) : (
                  searchResults.map((food) => (
                    <div
                      key={food.food_code}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-800 truncate">
                          {food.food_name}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-600">
                            {food.energy_kcal ? `${Math.round(food.energy_kcal)} kcal` : 'N/A'}
                          </span>
                          <span>P: {food.protein_g ?? 0}g</span>
                          <span>C: {food.carb_g ?? 0}g</span>
                          <span>F: {food.fat_g ?? 0}g</span>
                          {food.servings_unit && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                              Serving: {food.servings_unit}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addItemToMeal(food)}
                        className="shrink-0 p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                        title="Add to Meal"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Meal Builder & Calculations (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Meal Items Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-base">Current Meal Items</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                  Your meal is currently empty. Click '+' on any food on the left to add it!
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.food_code}
                      className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-800 truncate">
                          {item.food_name || item.food_code}
                        </div>
                        {item.servings_unit && (
                          <div className="text-[11px] text-slate-400">
                            Typical serving unit: {item.servings_unit}
                          </div>
                        )}
                      </div>

                      {/* Gram Quantity Control */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="2000"
                            value={item.quantity_g}
                            onChange={(e) => updateQuantity(item.food_code, parseFloat(e.target.value))}
                            className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-right focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-medium text-slate-500">grams</span>
                        </div>

                        {/* Quick increment buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateQuantity(item.food_code, item.quantity_g + 50)}
                            className="px-2 py-1 rounded bg-slate-200/80 text-[11px] font-semibold hover:bg-slate-300 transition-colors"
                          >
                            +50g
                          </button>
                        </div>

                        <button
                          onClick={() => removeItemFromMeal(item.food_code)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"
                          title="Remove food"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations & Charts Display */}
            {analysis && (
              <div className="space-y-6">
                {/* Total Macronutrient Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-emerald-600" />
                      Total Energy
                    </div>
                    <div className="text-2xl font-bold text-emerald-950 mt-1">
                      {analysis.total_nutrients?.energy_kcal ? Math.round(analysis.total_nutrients.energy_kcal) : 0}
                      <span className="text-xs font-normal text-emerald-700 ml-1">kcal</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/80 p-4 rounded-xl">
                    <div className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                      <Wheat className="w-3.5 h-3.5 text-blue-600" />
                      Carbohydrates
                    </div>
                    <div className="text-2xl font-bold text-blue-950 mt-1">
                      {analysis.total_nutrients?.carb_g ? Math.round(analysis.total_nutrients.carb_g) : 0}
                      <span className="text-xs font-normal text-blue-700 ml-1">g</span>
                    </div>
                  </div>

                  <div className="bg-teal-50 border border-teal-200/80 p-4 rounded-xl">
                    <div className="text-xs font-semibold text-teal-800 flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5 text-teal-600" />
                      Protein
                    </div>
                    <div className="text-2xl font-bold text-teal-950 mt-1">
                      {analysis.total_nutrients?.protein_g ? Math.round(analysis.total_nutrients.protein_g) : 0}
                      <span className="text-xs font-normal text-teal-700 ml-1">g</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-xl">
                    <div className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-amber-600" />
                      Total Fats
                    </div>
                    <div className="text-2xl font-bold text-amber-950 mt-1">
                      {analysis.total_nutrients?.fat_g ? Math.round(analysis.total_nutrients.fat_g) : 0}
                      <span className="text-xs font-normal text-amber-700 ml-1">g</span>
                    </div>
                  </div>
                </div>

                {/* Macro Distribution Chart & Micronutrients */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Caloric Distribution (Donut Chart) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <PieIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Caloric Macro Split (% of kcal)
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={macroPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {macroPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={MACRO_COLORS[index % MACRO_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(val: any) => `${val}%`} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Micronutrients Bar Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                      Key Micronutrients & Fiber
                    </div>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={micronutrientBarData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Food-wise Contribution Breakdown Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Item-by-Item Breakdown
                    </span>
                    <span className="text-xs text-slate-400">Deterministic Sum</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Food</th>
                          <th className="py-2.5 px-3">Portion</th>
                          <th className="py-2.5 px-3">Energy</th>
                          <th className="py-2.5 px-3">Carbs</th>
                          <th className="py-2.5 px-3">Protein</th>
                          <th className="py-2.5 px-3">Fat</th>
                          <th className="py-2.5 px-3">Fiber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysis.items_breakdown.map((item) => (
                          <tr key={item.food_code} className="hover:bg-slate-50/40">
                            <td className="py-3 px-4 font-semibold text-slate-800">{item.food_name}</td>
                            <td className="py-3 px-3 font-mono">{item.quantity_g}g</td>
                            <td className="py-3 px-3 font-bold text-emerald-600">
                              {item.nutrients?.energy_kcal ? `${Math.round(item.nutrients.energy_kcal)} kcal` : 'N/A'}
                            </td>
                            <td className="py-3 px-3 text-slate-600">{item.nutrients?.carb_g ?? 0}g</td>
                            <td className="py-3 px-3 text-slate-600">{item.nutrients?.protein_g ?? 0}g</td>
                            <td className="py-3 px-3 text-slate-600">{item.nutrients?.fat_g ?? 0}g</td>
                            <td className="py-3 px-3 text-slate-600">{item.nutrients?.fibre_g ?? 0}g</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save Meal Form */}
                <form
                  onSubmit={handleSaveMeal}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3"
                >
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="Enter meal name e.g. Healthy Lunch, High-Protein Breakfast..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingMeal}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    <span>{savingMeal ? 'Saving...' : 'Save Meal to History'}</span>
                  </button>
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
                      <Check className="w-4 h-4" /> Saved!
                    </span>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SAVED MEAL HISTORY TAB */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Meal Intake History</h3>
              <p className="text-xs text-slate-400 mt-0.5">Persisted in MongoDB meals collection</p>
            </div>
            <button
              onClick={() => setActiveTab('builder')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
            >
              + Create New Meal
            </button>
          </div>

          {savedMeals.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No saved meals yet. Build a meal and click "Save Meal to History"!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {savedMeals.map((meal) => (
                <div key={meal.meal_id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{meal.meal_name}</h4>
                      <p className="text-xs text-slate-400">
                        {new Date(meal.created_at).toLocaleDateString()} at{' '}
                        {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-emerald-600">
                          {meal.total_nutrients?.energy_kcal ? Math.round(meal.total_nutrients.energy_kcal) : 0} kcal
                        </div>
                        <div className="text-xs text-slate-400">Weight: {meal.total_weight_g}g</div>
                      </div>

                      <button
                        onClick={() => handleDeleteMeal(meal.meal_id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Delete meal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Food items tags */}
                  <div className="flex flex-wrap gap-2">
                    {meal.items.map((i, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {i.food_name} <strong className="text-slate-900 font-semibold">({i.quantity_g}g)</strong>
                      </span>
                    ))}
                  </div>

                  {/* Macro ratio preview */}
                  <div className="text-xs text-slate-500 flex gap-4 pt-1">
                    <span>
                      Carbs: <strong>{meal.macronutrient_ratios?.carb_energy_pct}%</strong>
                    </span>
                    <span>
                      Protein: <strong>{meal.macronutrient_ratios?.protein_energy_pct}%</strong>
                    </span>
                    <span>
                      Fats: <strong>{meal.macronutrient_ratios?.fat_energy_pct}%</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
