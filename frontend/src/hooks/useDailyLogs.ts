import { useState, useEffect, useCallback } from 'react';

export interface MealItem {
  item_name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  iron_mg?: number;
  zinc_mg?: number;
  magnesium_mg?: number;
  calcium_mg?: number;
  potassium_mg?: number;
  sodium_mg?: number;
  VitaminD3_mg?: number;
  VitaminB12_mg?: number;
}

export interface MealLog {
  id: string;
  timestamp: number;
  items: MealItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_iron?: number;
  total_zinc?: number;
  total_magnesium?: number;
  total_calcium?: number;
  total_potassium?: number;
  total_sodium?: number;
  total_VitaminD3?: number;
  total_VitaminB12?: number;
  medical_flags?: { condition: string; severity: 'red' | 'yellow'; message: string }[];
  bio_score?: number;
  smart_swaps?: { original: string; swap: string; reason: string }[];
}

export function useDailyLogs() {
  const [logs, setLogs] = useState<MealLog[]>([]);

  const getTodayKey = () => {
    const today = new Date();
    return `somi_logs_${today.toISOString().split('T')[0]}`;
  };

  useEffect(() => {
    const key = getTodayKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse daily logs', e);
      }
    }
  }, []);

  const addMeal = useCallback((meal: Omit<MealLog, 'id' | 'timestamp'>) => {
    const key = getTodayKey();
    const newLog: MealLog = {
      ...meal,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    setLogs((prev) => {
      const nextLogs = [newLog, ...prev];
      localStorage.setItem(key, JSON.stringify(nextLogs));
      return nextLogs;
    });
  }, []);

  const deleteMeal = useCallback((id: string) => {
    const key = getTodayKey();
    setLogs((prev) => {
      const nextLogs = prev.filter((log) => log.id !== id);
      localStorage.setItem(key, JSON.stringify(nextLogs));
      return nextLogs;
    });
  }, []);

  return { logs, addMeal, deleteMeal };
}
