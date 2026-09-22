import React from 'react';

interface Props {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fats: number;
  fatsTarget: number;
  micros?: {
    iron: number;
    zinc: number;
    magnesium: number;
    calcium: number;
    potassium: number;
    sodium: number;
    VitaminD3: number;
    VitaminB12: number;
  };
  microTargets?: {
    iron: number;
    zinc: number;
    magnesium: number;
    calcium: number;
    potassium: number;
    sodium: number;
    VitaminD3: number;
    VitaminB12: number;
  };
}

const ProgressBar = ({ label, value, target, colorClass, unit = 'g' }: { label: string, value: number, target: number, colorClass: string, unit?: string }) => {
  const percentage = Math.min(100, Math.round((value / (target || 1)) * 100));
  const displayValue = value < 1 ? value.toFixed(4) : Math.round(value);
  
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm font-medium">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-600 dark:text-gray-400">{displayValue} / {target}{unit}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2.5 rounded-full ${colorClass}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default function CalorieMacroRings({
  calories, calorieTarget,
  protein, proteinTarget,
  carbs, carbsTarget,
  fats, fatsTarget,
  micros, microTargets
}: Props) {
  const caloriePercentage = Math.min(100, Math.round((calories / (calorieTarget || 1)) * 100));

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">Daily Summary</h3>
      
      <div className="mb-8 flex items-center justify-center">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200 dark:text-gray-600"
              strokeDasharray="100, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="text-blue-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${caloriePercentage}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
          </svg>
          <div className="text-center">
            <span className="block text-2xl font-bold text-gray-900 dark:text-white">{Math.round(calories)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">kcal</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ProgressBar label="Protein" value={protein} target={proteinTarget} colorClass="bg-red-500" />
        <ProgressBar label="Carbs" value={carbs} target={carbsTarget} colorClass="bg-green-500" />
        <ProgressBar label="Fats" value={fats} target={fatsTarget} colorClass="bg-yellow-500" />
      </div>

      {micros && (
        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Micronutrients</h4>
          <div className="space-y-4">
            <ProgressBar label="Iron" value={micros.iron} target={microTargets?.iron || 18} colorClass="bg-purple-500" unit="mg" />
            <ProgressBar label="Zinc" value={micros.zinc} target={microTargets?.zinc || 11} colorClass="bg-cyan-500" unit="mg" />
            <ProgressBar label="Magnesium" value={micros.magnesium} target={microTargets?.magnesium || 400} colorClass="bg-teal-500" unit="mg" />
            <ProgressBar label="Calcium" value={micros.calcium} target={microTargets?.calcium || 1000} colorClass="bg-orange-500" unit="mg" />
            <ProgressBar label="Potassium" value={micros.potassium} target={microTargets?.potassium || 3400} colorClass="bg-pink-500" unit="mg" />
            <ProgressBar label="Sodium" value={micros.sodium} target={microTargets?.sodium || 2300} colorClass="bg-gray-400" unit="mg" />
            <ProgressBar label="Vitamin D3" value={micros.VitaminD3} target={microTargets?.VitaminD3 || 0.02} colorClass="bg-indigo-500" unit="mg" />
            <ProgressBar label="Vitamin B12" value={micros.VitaminB12} target={microTargets?.VitaminB12 || 0.0024} colorClass="bg-lime-500" unit="mg" />
          </div>
        </div>
      )}
    </div>
  );
}
