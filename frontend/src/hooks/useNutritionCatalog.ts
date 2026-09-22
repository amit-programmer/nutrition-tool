import { useState, useEffect, useCallback } from 'react';

export interface NutritionItem {
  item_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
}

export function useNutritionCatalog() {
  const [catalog, setCatalog] = useState<Record<string, NutritionItem>>({});

  useEffect(() => {
    const saved = localStorage.getItem('somi_nutrition_catalog');
    if (saved) {
      try {
        setCatalog(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse nutrition catalog', e);
      }
    }
  }, []);

  const findCachedItem = useCallback(
    (name: string) => {
      const key = name.toLowerCase().trim();
      return catalog[key] || null;
    },
    [catalog]
  );

  const appendCatalog = useCallback(
    (newItems: NutritionItem[]) => {
      setCatalog((prev) => {
        const nextCatalog = { ...prev };
        newItems.forEach((item) => {
          const key = item.item_name.toLowerCase().trim();
          nextCatalog[key] = item;
        });
        localStorage.setItem('somi_nutrition_catalog', JSON.stringify(nextCatalog));
        return nextCatalog;
      });
    },
    []
  );

  return { catalog, findCachedItem, appendCatalog };
}
