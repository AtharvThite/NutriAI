import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Brain,
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { api } from '../services/api';
import {
  AlternativeFoodSearchItem,
  OriginalFoodSummary,
  AlternativeCandidate,
  RecommendAlternativesResponse,
  ExplainAlternativeResponse,
  SavedComparisonItem,
  NaturalLanguageIntentResponse
} from '../types';

import { UnifiedAlternativeQuery } from '../components/alternatives/UnifiedAlternativeQuery';
import { AlternativeFoodCard } from '../components/alternatives/AlternativeFoodCard';
import { NutritionComparison } from '../components/alternatives/NutritionComparison';
import { NutrientDifferenceChart } from '../components/alternatives/NutrientDifferenceChart';
import { AlternativeExplanation } from '../components/alternatives/AlternativeExplanation';
import { SavedAlternatives } from '../components/alternatives/SavedAlternatives';

export const SmartFoodAlternatives: React.FC = () => {
  // Main Selection State
  const [selectedFood, setSelectedFood] = useState<OriginalFoodSummary | null>(null);
  const [quantityG, setQuantityG] = useState<number>(100);
  const [objective, setObjective] = useState<string>('higher_protein');
  const [dietaryPreference, setDietaryPreference] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<AlternativeCandidate[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeCandidate | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // RAG Explanation State
  const [explanationData, setExplanationData] = useState<ExplainAlternativeResponse | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(false);

  // Saved Comparisons State
  const [savedComparisons, setSavedComparisons] = useState<SavedComparisonItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const comparisonRef = useRef<HTMLDivElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);

  // Initial mount: load saved comparisons & default staple (Boiled rice)
  useEffect(() => {
    loadSavedComparisons();

    const loadDefaultFood = async () => {
      try {
        const searchRes = await api.searchAlternatives('rice', 5);
        if (searchRes.length > 0) {
          // Pick Boiled rice or first match
          const target = searchRes.find(f => f.food_name.toLowerCase().includes('boiled rice')) || searchRes[0];
          handleSelectFood(target);
        }
      } catch (err) {
        console.warn('Initial default food search failed:', err);
      }
    };

    loadDefaultFood();
  }, []);

  // Fetch recommendations whenever selected food, objective, dietary preference, category filter, or portion changes
  useEffect(() => {
    if (!selectedFood) return;

    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      setErrorMsg(null);
      try {
        const res = await api.recommendAlternatives({
          food_code: selectedFood.food_code,
          quantity_g: quantityG,
          objective,
          dietary_preference: dietaryPreference,
          category_filter: categoryFilter,
          limit: 6
        });

        setSelectedFood(res.original_food);
        setRecommendations(res.alternatives);

        // Auto-select #1 alternative if current selection not in new pool
        if (res.alternatives.length > 0) {
          const currentInPool = res.alternatives.find(
            a => a.food_code === selectedAlternative?.food_code
          );
          setSelectedAlternative(currentInPool || res.alternatives[0]);
        } else {
          setSelectedAlternative(null);
        }
      } catch (err: any) {
        console.error('Failed to load alternatives:', err);
        setErrorMsg(err.response?.data?.detail || err.message || 'Could not fetch alternatives.');
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [selectedFood?.food_code, objective, dietaryPreference, categoryFilter, quantityG]);

  const loadSavedComparisons = async () => {
    setIsLoadingSaved(true);
    try {
      const list = await api.getSavedAlternatives();
      setSavedComparisons(list);
    } catch (err) {
      console.warn('Failed to load saved comparisons:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSelectFood = async (item: AlternativeFoodSearchItem) => {
    // Optimistically set original summary baseline
    setSelectedFood({
      food_code: item.food_code,
      food_name: item.food_name,
      category: item.category,
      dietary_type: item.dietary_type,
      nutrition_basis: item.nutrition_basis,
      quantity_g: quantityG,
      nutrients: {
        energy_kcal: item.energy_kcal ?? null,
        protein_g: item.protein_g ?? null,
        carb_g: item.carb_g ?? null,
        fat_g: item.fat_g ?? null,
        fibre_g: item.fibre_g ?? null
      },
      nutrients_per_100g: {
        energy_kcal: item.energy_kcal ?? null,
        protein_g: item.protein_g ?? null,
        carb_g: item.carb_g ?? null,
        fat_g: item.fat_g ?? null,
        fibre_g: item.fibre_g ?? null
      },
      servings_unit: item.servings_unit
    });
    setExplanationData(null);
  };

  const handleExplain = async (alt: AlternativeCandidate) => {
    if (!selectedFood) return;
    setSelectedAlternative(alt);
    setIsLoadingExplanation(true);

    if (explanationRef.current) {
      explanationRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const expRes = await api.explainAlternative({
        original_food_code: selectedFood.food_code,
        alternative_food_code: alt.food_code,
        objective,
        quantity_g: quantityG
      });
      setExplanationData(expRes);
    } catch (err: any) {
      console.error('Explanation error:', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleSaveCurrentComparison = async (altCandidate?: AlternativeCandidate) => {
    const targetAlt = altCandidate || selectedAlternative;
    if (!selectedFood || !targetAlt) return;

    try {
      await api.saveAlternative({
        original_food_code: selectedFood.food_code,
        alternative_food_code: targetAlt.food_code,
        objective,
        quantity_g: quantityG,
        notes: `Smart alternative comparison for ${targetAlt.food_name}`
      });

      setSaveSuccessMsg(`Saved comparison: ${selectedFood.food_name} → ${targetAlt.food_name}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      loadSavedComparisons();
    } catch (err) {
      console.error('Failed to save comparison:', err);
    }
  };

  const handleDeleteSaved = async (comparisonId: string) => {
    try {
      await api.deleteSavedAlternative(comparisonId);
      setSavedComparisons(prev => prev.filter(c => c.comparison_id !== comparisonId));
    } catch (err) {
      console.error('Failed to delete saved comparison:', err);
    }
  };

  const handleSelectSaved = async (saved: SavedComparisonItem) => {
    setQuantityG(saved.quantity_g || 100);
    setObjective(saved.objective || 'similar');

    try {
      const searchOrig = await api.searchAlternatives(saved.original_food_name, 1);
      if (searchOrig.length > 0) {
        await handleSelectFood(searchOrig[0]);
      }
      if (comparisonRef.current) {
        comparisonRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error reopening saved comparison:', err);
    }
  };

  const handleApplyAIInterpretation = async (res: NaturalLanguageIntentResponse) => {
    if (res.matched_food_code && res.matched_food_name) {
      const searchRes = await api.searchAlternatives(res.matched_food_name, 1);
      if (searchRes.length > 0) {
        handleSelectFood(searchRes[0]);
      }
    }
  };

  const isCurrentSaved = selectedAlternative
    ? savedComparisons.some(
        s =>
          s.original_food_code === selectedFood?.food_code &&
          s.alternative_food_code === selectedAlternative.food_code &&
          s.objective === objective
      )
    : false;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-900">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              Anuvaad Food Intelligence
            </span>
            <span className="text-xs text-slate-400 font-mono">1,014 Verified Indian Foods</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Food Alternatives
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Discover nutritionally comparable Indian food alternatives, understand macro & micronutrient deltas on consistent gram weights, and explore clinical RAG explanations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Deterministic Math • Zero Hallucination</span>
          </div>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SECTION 1: Unified AI Food & Goal Query */}
      <UnifiedAlternativeQuery
        selectedFood={selectedFood}
        onSelectFood={handleSelectFood}
        quantityG={quantityG}
        onChangeQuantity={setQuantityG}
        objective={objective}
        onChangeObjective={setObjective}
        dietaryPreference={dietaryPreference}
        onChangeDietaryPreference={setDietaryPreference}
        categoryFilter={categoryFilter}
        onChangeCategoryFilter={setCategoryFilter}
        onApplyAIInterpretation={handleApplyAIInterpretation}
        isLoading={isLoadingRecommendations}
      />

      {/* SECTION 2: Recommended Alternatives */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Recommended Alternatives ({recommendations.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by normalized numerical similarity and <strong className="capitalize text-emerald-700">{objective.replace('_', ' ')}</strong> criteria.
            </p>
          </div>

          {selectedFood && (
            <span className="text-xs text-slate-400 font-mono">
              Replacing {selectedFood.food_name} ({quantityG}g)
            </span>
          )}
        </div>

        {/* Loading / Error / Cards Grid */}
        {isLoadingRecommendations ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center shadow-xs">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-700">Evaluating targeted nutritional alternatives...</p>
            <p className="text-[11px] text-slate-400 mt-1">Applying indexed nutrient bounds and calculating gram-level macro shifts</p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((alt) => (
              <AlternativeFoodCard
                key={alt.food_code}
                alternative={alt}
                isSelected={selectedAlternative?.food_code === alt.food_code}
                onSelect={(chosen) => {
                  setSelectedAlternative(chosen);
                  if (comparisonRef.current) {
                    comparisonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                onExplain={handleExplain}
                onSave={handleSaveCurrentComparison}
                isSaved={savedComparisons.some(
                  s =>
                    s.original_food_code === selectedFood?.food_code &&
                    s.alternative_food_code === alt.food_code &&
                    s.objective === objective
                )}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs">
            <p className="text-xs text-slate-500">
              No matching alternatives found with the current criteria. Try selecting "All Diets" or "Nutritionally Similar".
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: Side-by-Side Comparison & Chart */}
      {selectedFood && selectedAlternative && (
        <div ref={comparisonRef} className="space-y-6 pt-2">
          {/* Comparison Table */}
          <NutritionComparison
            originalFood={selectedFood}
            selectedAlternative={selectedAlternative}
            quantityG={quantityG}
            onSaveComparison={() => handleSaveCurrentComparison(selectedAlternative)}
            isSaved={isCurrentSaved}
          />

          {/* Bar Chart */}
          <NutrientDifferenceChart
            originalFood={selectedFood}
            selectedAlternative={selectedAlternative}
            quantityG={quantityG}
          />
        </div>
      )}

      {/* SECTION 4: AI Explanation (RAG) */}
      <div ref={explanationRef}>
        <AlternativeExplanation
          explanationData={explanationData}
          isLoading={isLoadingExplanation}
        />
      </div>

      {/* SECTION 5: Saved Comparisons */}
      <SavedAlternatives
        savedList={savedComparisons}
        onSelectSaved={handleSelectSaved}
        onDeleteSaved={handleDeleteSaved}
        isLoading={isLoadingSaved}
      />
    </div>
  );
};

export default SmartFoodAlternatives;
