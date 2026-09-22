'use client';

import React, { useRef, useState } from 'react';
import { Activity, ArrowRight, Share2, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface Swap {
  original: string;
  swap: string;
  reason: string;
}

interface Props {
  score?: number;
  message?: string;
  swaps?: Swap[];
}

export default function BioScoreCard({ score, message, swaps }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportAsImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#1f2937', // gray-800 for dark mode compatibility
        pixelRatio: 2, // High resolution
        skipFonts: false,
        filter: (node) => {
          return (node as HTMLElement).id !== 'share-btn';
        }
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'somi-bioscore.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Failed to export image:', error);
      alert(`Failed to export the image: ${error?.message || error}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  if (score === undefined && (!swaps || swaps.length === 0)) return null;

  const scoreColor =
    score && score >= 80 ? 'text-green-500' : score && score >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div ref={cardRef} className="relative rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Bio-Score
        </h3>
        <div className="flex items-center gap-4">
          <button
            id="share-btn"
            onClick={async () => {
              // Set exporting state to show logo
              setIsExporting(true);
              // Wait a bit for React to render the logo in the DOM
              await new Promise(resolve => setTimeout(resolve, 150));
              await exportAsImage();
            }}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
            {isExporting ? 'Exporting...' : 'Share'}
          </button>
          {score !== undefined && (
            <div className={`text-2xl font-black ${scoreColor}`}>
              {score}<span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
            </div>
          )}
          {isExporting && (
            <img src="/logo.png" alt="Somi Logo" className="h-8 w-8 object-contain ml-2" />
          )}
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
          {message}
        </div>
      )}

      {swaps && swaps.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Smart Swaps
          </h4>
          {swaps.map((swap, index) => (
            <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center gap-3 mb-2 text-sm font-medium">
                <span className="line-through text-gray-500">{swap.original}</span>
                <ArrowRight className="h-4 w-4 text-blue-500" />
                <span className="text-green-600 dark:text-green-400">{swap.swap}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">{swap.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
