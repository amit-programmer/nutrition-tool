import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Flag {
  condition: string;
  severity: 'red' | 'yellow';
  message: string;
}

interface Props {
  flags?: Flag[];
}

export default function MedicalAlertBanners({ flags }: Props) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="space-y-3">
      {flags.map((flag, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 rounded-xl p-4 ${
            flag.severity === 'red'
              ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
              : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
          }`}
        >
          {flag.severity === 'red' ? (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <div>
            <h4 className="font-bold">{flag.condition}</h4>
            <p className="text-sm">{flag.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
