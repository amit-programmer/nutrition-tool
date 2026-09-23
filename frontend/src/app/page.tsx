'use client';

import React, { useState, useEffect } from 'react';
import { useMounted } from '../hooks/useMounted';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNutritionCatalog } from '../hooks/useNutritionCatalog';
import { useDailyLogs, MealLog } from '../hooks/useDailyLogs';

import UserProfileModal from '../components/UserProfileModal';
import VoiceSearchBar from '../components/VoiceSearchBar';
import CalorieMacroRings from '../components/CalorieMacroRings';
import MedicalAlertBanners from '../components/MedicalAlertBanners';
import BioScoreCard from '../components/BioScoreCard';
import DailyMealTimeline from '../components/DailyMealTimeline';

export default function Dashboard() {
  const isMounted = useMounted();
  const { profile, saveProfile } = useUserProfile();
  const { catalog, appendCatalog } = useNutritionCatalog();
  const { logs, addMeal, deleteMeal } = useDailyLogs();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [dailyBioScore, setDailyBioScore] = useState<{ score: number; message: string } | null>(null);
  const [isCalculatingDaily, setIsCalculatingDaily] = useState(false);

  useEffect(() => {
    if (!isMounted || !profile) return;
    let isSubscribed = true;

    const fetchDailyScore = async () => {
      setIsCalculatingDaily(true);
      try {
        const normalizedProfile = {
          age: profile.age,
          gender: profile.gender,
          height_cm: profile.height,
          weight_kg: profile.weight,
          activity_level: profile.activityLevel || 'moderate',
          goal: profile.target || 'maintenance',
          medical_conditions: (profile.medicalConditions || []).map((c) => c.toLowerCase().trim()),
        };

        const dailyTotals = {
          calories: logs.reduce((sum, log) => sum + log.total_calories, 0),
          protein_g: logs.reduce((sum, log) => sum + log.total_protein, 0),
          carbs_g: logs.reduce((sum, log) => sum + log.total_carbs, 0),
          fats_g: logs.reduce((sum, log) => sum + log.total_fats, 0),
          sodium_mg: logs.reduce((sum, log) => sum + (log.total_sodium || 0), 0),
        };

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await fetch(`${baseUrl}/api/analyze-daily-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_profile: normalizedProfile,
            daily_totals: dailyTotals,
            meal_count: logs.length,
          }),
        });

        if (!response.ok) throw new Error('Daily score failed');
        const data = await response.json();
        
        if (isSubscribed) {
          setDailyBioScore({ score: data.bio_score, message: data.summary_message });
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isSubscribed) setIsCalculatingDaily(false);
      }
    };

    fetchDailyScore();
    return () => { isSubscribed = false; };
  }, [logs, profile, isMounted]);

  useEffect(() => {
    if (isMounted && !profile) {
      setIsProfileModalOpen(true);
    }
  }, [isMounted, profile]);

  const handleMealSubmit = async (text: string) => {
    setIsAnalyzing(true);
    try {
      // Normalize profile to snake_case so the AI system prompt can read all fields correctly
      const normalizedProfile = profile ? {
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height,
        weight_kg: profile.weight,
        activity_level: profile.activityLevel || 'moderate',
        goal: profile.target || 'maintenance',
        medical_conditions: (profile.medicalConditions || []).map((c) => c.toLowerCase().trim()),
      } : {};

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${baseUrl}/api/analyze-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_text: text,
          user_profile: normalizedProfile,
        }),
      });

      if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch (e) {}
        throw new Error(errData?.error || 'Analysis failed');
      }

      const data = await response.json();
      
      // Normalize catalog_additions to NutritionItem shape before caching
      if (data.catalog_additions && data.catalog_additions.length > 0) {
        const normalizedCatalog = data.catalog_additions.map((entry: any) => ({
          item_name: entry.key_identifier || entry.item_name || 'unknown',
          calories: entry.base_calories ?? entry.calories ?? 0,
          protein_g: entry.base_protein_g ?? entry.protein_g ?? 0,
          carbs_g: entry.base_carbs_g ?? entry.carbs_g ?? 0,
          fats_g: entry.base_fats_g ?? entry.fats_g ?? 0,
          fiber_g: entry.base_fiber_g ?? entry.fiber_g ?? 0,
        }));
        appendCatalog(normalizedCatalog);
      }

      // Normalize backend schema → frontend MealItem shape
      const totals = data.meal_totals || {};
      const insights = data.commerce_and_goal_insights || {};

      const normalizedItems = (data.parsed_items || []).map((item: any) => ({
        item_name: item.food_name || item.item_name || 'Unknown',
        quantity: item.entered_quantity || item.quantity || '',
        calories: item.calories || 0,
        protein_g: item.macros?.protein_g ?? item.protein_g ?? 0,
        carbs_g: item.macros?.carbs_g ?? item.carbs_g ?? 0,
        fats_g: item.macros?.fats_g ?? item.fats_g ?? 0,
        iron_mg: item.micros?.iron_mg ?? item.iron_mg ?? 0,
        zinc_mg: item.micros?.zinc_mg ?? item.zinc_mg ?? 0,
        magnesium_mg: item.micros?.magnesium_mg ?? item.magnesium_mg ?? 0,
        calcium_mg: item.micros?.calcium_mg ?? item.calcium_mg ?? 0,
        potassium_mg: item.micros?.potassium_mg ?? item.potassium_mg ?? 0,
        sodium_mg: item.micros?.sodium_mg ?? item.sodium_mg ?? 0,
        VitaminD3_mg: item.micros?.VitaminD3_mg ?? item.VitaminD3_mg ?? 0,
        VitaminB12_mg: item.micros?.VitaminB12_mg ?? item.VitaminB12_mg ?? 0,
      }));

      // Normalize medical_flags: CRITICAL→red, CAUTION→yellow
      // Filter strictly to ONLY conditions the user declared in their profile
      const userConditions = normalizedProfile.medical_conditions || [];
      const allFlags = (data.medical_flags || []).map((flag: any) => ({
        condition: flag.target_condition || flag.condition || 'Advisory',
        severity: flag.severity === 'CRITICAL' ? 'red' : 'yellow',
        message: flag.clinical_reason || flag.message || flag.mitigation_action || '',
      }));
      const normalizedFlags = userConditions.length > 0
        ? allFlags.filter((flag: any) =>
            userConditions.some((uc: string) =>
              flag.condition.toLowerCase().includes(uc) || uc.includes(flag.condition.toLowerCase())
            )
          )
        : []; // No conditions declared → zero flags shown

      // Normalize smart_swaps field names
      const normalizedSwaps = (insights.smart_swaps || []).map((swap: any) => ({
        original: swap.original_food || swap.original || '',
        swap: swap.recommended_swap || swap.swap || '',
        reason: swap.benefit || swap.reason || '',
      }));

      const mealLog: Omit<MealLog, 'id' | 'timestamp'> = {
        items: normalizedItems,
        total_calories: totals.total_calories || 0,
        total_protein: totals.total_protein_g || 0,
        total_carbs: totals.total_carbs_g || 0,
        total_fats: totals.total_fats_g || 0,
        total_iron: totals.total_iron_mg || 0,
        total_zinc: totals.total_zinc_mg || 0,
        total_magnesium: totals.total_magnesium_mg || 0,
        total_calcium: totals.total_calcium_mg || 0,
        total_potassium: totals.total_potassium_mg || 0,
        total_sodium: totals.total_sodium_mg || 0,
        total_VitaminD3: totals.total_VitaminD3_mg || 0,
        total_VitaminB12: totals.total_VitaminB12_mg || 0,
        medical_flags: normalizedFlags,
        bio_score: insights.bio_score,
        smart_swaps: normalizedSwaps,
      };
      
      addMeal(mealLog);

    } catch (error: any) {
      console.error('Error analyzing meal:', error);
      alert(error.message || 'Failed to analyze meal. Please ensure backend is running.');
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageSubmit = async (base64: string, mimeType: string, foodHint: string): Promise<string> => {
    setIsAnalyzing(true);
    try {
      const normalizedProfile = profile ? {
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height,
        weight_kg: profile.weight,
        activity_level: profile.activityLevel || 'moderate',
        goal: profile.target || 'maintenance',
        medical_conditions: (profile.medicalConditions || []).map((c) => c.toLowerCase().trim()),
      } : {};

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${baseUrl}/api/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          mime_type: mimeType,
          food_hint: foodHint,
          user_profile: normalizedProfile,
        }),
      });

      if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch (e) {}
        throw new Error(errData?.error || 'Image analysis failed');
      }

      const data = await response.json();
      return data.transcript || '';
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      alert(error.message || 'Failed to analyze photo. Please try again.');
      throw error; // Re-throw so VoiceSearchBar knows it failed
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isMounted) return null; // Hydration safety

  // Derive display data from the most recent log — updates instantly on delete
  const mostRecentLog = logs.length > 0 ? logs[0] : null;
  const latestScore = mostRecentLog?.bio_score;
  const latestFlags = mostRecentLog?.medical_flags || [];
  const latestSwaps = mostRecentLog?.smart_swaps || [];

  // Calculate daily totals
  const dailyCalories = logs.reduce((sum, log) => sum + log.total_calories, 0);
  const dailyProtein = logs.reduce((sum, log) => sum + log.total_protein, 0);
  const dailyCarbs = logs.reduce((sum, log) => sum + log.total_carbs, 0);
  const dailyFats = logs.reduce((sum, log) => sum + log.total_fats, 0);
  
  const dailyMicros = {
    iron: logs.reduce((sum, log) => sum + (log.total_iron || 0), 0),
    zinc: logs.reduce((sum, log) => sum + (log.total_zinc || 0), 0),
    magnesium: logs.reduce((sum, log) => sum + (log.total_magnesium || 0), 0),
    calcium: logs.reduce((sum, log) => sum + (log.total_calcium || 0), 0),
    potassium: logs.reduce((sum, log) => sum + (log.total_potassium || 0), 0),
    sodium: logs.reduce((sum, log) => sum + (log.total_sodium || 0), 0),
    VitaminD3: logs.reduce((sum, log) => sum + (log.total_VitaminD3 || 0), 0),
    VitaminB12: logs.reduce((sum, log) => sum + (log.total_VitaminB12 || 0), 0),
  };

  const isFemale = profile?.gender === 'female';
  const targets = {
    calories: profile?.target === 'weight_loss' ? 1800 : profile?.target === 'muscle_gain' ? 2800 : 2200,
    protein: profile?.weight ? profile.weight * 1.8 : 120, // 1.8g per kg default
    carbs: 250,
    fats: 65,
    iron: isFemale ? 18 : 8,
    zinc: isFemale ? 8 : 11,
    magnesium: isFemale ? 310 : 400,
    calcium: 1000,
    potassium: isFemale ? 2600 : 3400,
    sodium: 2300,
    VitaminD3: 0.02, // 20mcg -> 0.02mg typical daily goal
    VitaminB12: 0.0024, // 2.4mcg -> 0.0024mg typical daily goal
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Somi Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">Somi.</h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Nutrition Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {profile ? 'Edit Profile' : 'Setup Profile'}
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* Main Feed */}
          <div className="md:col-span-2 space-y-6">
            <VoiceSearchBar onSubmit={handleMealSubmit} onImageSubmit={handleImageSubmit} isLoading={isAnalyzing} />
            
            {isAnalyzing ? (
              <div className="flex justify-center items-center py-12">
                <img 
                  src="/system-solid-4029-spinner-dashes.svg" 
                  alt="Analyzing..." 
                  className="h-16 w-16 animate-spin" 
                />
              </div>
            ) : (
              (latestFlags.length > 0 || dailyBioScore || latestScore !== undefined) && (
                <div className="space-y-6">
                  <MedicalAlertBanners flags={latestFlags} />
                  <BioScoreCard 
                    score={dailyBioScore?.score ?? latestScore} 
                    message={dailyBioScore?.message}
                    swaps={latestSwaps} 
                  />
                </div>
              )
            )}

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Today's Meals</h2>
                {logs.length > 0 && (
                  <button 
                    onClick={() => {
                      if(confirm('Are you sure you want to clear your old meals?')) {
                        const key = `somi_logs_${new Date().toISOString().split('T')[0]}`;
                        localStorage.removeItem(key);
                        window.location.reload();
                      }
                    }}
                    className="text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    Clear Old Meals
                  </button>
                )}
              </div>
              <DailyMealTimeline logs={logs} onDelete={deleteMeal} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CalorieMacroRings
              calories={dailyCalories}
              calorieTarget={targets.calories}
              protein={dailyProtein}
              proteinTarget={targets.protein}
              carbs={dailyCarbs}
              carbsTarget={targets.carbs}
              fats={dailyFats}
              fatsTarget={targets.fats}
              micros={dailyMicros}
              microTargets={targets}
            />
          </div>

        </div>

      </div>

      {isProfileModalOpen && (
        <UserProfileModal
          initialProfile={profile}
          onSave={saveProfile}
          onClose={() => {
            if (profile) setIsProfileModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
