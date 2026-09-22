import React from 'react';
import { MealLog } from '../hooks/useDailyLogs';
import { Clock, Trash2 } from 'lucide-react';

interface Props {
  logs: MealLog[];
  onDelete: (id: string) => void;
}

export default function DailyMealTimeline({ logs, onDelete }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No meals logged today. Use the voice search to add one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => onDelete(log.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 mb-4">
            {log.items.map((item, idx) => (
              <div key={idx} className="flex justify-between font-medium text-gray-900 dark:text-white text-sm">
                <span>
                  {item.quantity && item.quantity.toLowerCase().includes(item.item_name.toLowerCase()) 
                    ? item.quantity 
                    : `${item.quantity} ${item.item_name}`.trim()}
                </span>
                <span>{item.calories} kcal</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="group relative cursor-default rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {Math.round(log.total_calories)} kcal
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                Calories
              </span>
            </span>
            <span className="group relative cursor-default rounded-full bg-red-50 px-2.5 py-1 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              P: {Math.round(log.total_protein)}g
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                Protein
              </span>
            </span>
            <span className="group relative cursor-default rounded-full bg-green-50 px-2.5 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              C: {Math.round(log.total_carbs)}g
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                Carbohydrates
              </span>
            </span>
            <span className="group relative cursor-default rounded-full bg-yellow-50 px-2.5 py-1 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              F: {Math.round(log.total_fats)}g
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                Fats
              </span>
            </span>
            {log.total_iron !== undefined && log.total_iron > 0 && (
              <span className="group relative cursor-default rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Fe: {Math.round(log.total_iron)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Iron
                </span>
              </span>
            )}
            {log.total_zinc !== undefined && log.total_zinc > 0 && (
              <span className="group relative cursor-default rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                Zn: {Math.round(log.total_zinc)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Zinc
                </span>
              </span>
            )}
            {log.total_magnesium !== undefined && log.total_magnesium > 0 && (
              <span className="group relative cursor-default rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                Mg: {Math.round(log.total_magnesium)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Magnesium
                </span>
              </span>
            )}
            {log.total_calcium !== undefined && log.total_calcium > 0 && (
              <span className="group relative cursor-default rounded-full bg-orange-50 px-2.5 py-1 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                Ca: {Math.round(log.total_calcium)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Calcium
                </span>
              </span>
            )}
            {log.total_potassium !== undefined && log.total_potassium > 0 && (
              <span className="group relative cursor-default rounded-full bg-pink-50 px-2.5 py-1 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                K: {Math.round(log.total_potassium)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Potassium
                </span>
              </span>
            )}
            {log.total_sodium !== undefined && log.total_sodium > 0 && (
              <span className="group relative cursor-default rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                Na: {Math.round(log.total_sodium)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Sodium
                </span>
              </span>
            )}
            {log.total_VitaminD3 !== undefined && log.total_VitaminD3 > 0 && (
              <span className="group relative cursor-default rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                D3: {log.total_VitaminD3.toFixed(4)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Vitamin D3
                </span>
              </span>
            )}
            {log.total_VitaminB12 !== undefined && log.total_VitaminB12 > 0 && (
              <span className="group relative cursor-default rounded-full bg-lime-50 px-2.5 py-1 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300">
                B12: {log.total_VitaminB12.toFixed(4)}mg
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max opacity-0 transition-opacity group-hover:opacity-100 bg-gray-800 text-white text-xs font-medium rounded py-1 px-2 shadow-lg dark:bg-white dark:text-gray-900 z-50">
                  Vitamin B12
                </span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
