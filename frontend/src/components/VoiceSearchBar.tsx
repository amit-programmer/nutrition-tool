'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Send, Paperclip, X, ImageIcon } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface Props {
  onSubmit: (text: string) => Promise<void> | void;
  onImageSubmit: (base64: string, mimeType: string, foodHint: string) => Promise<string> | string;
  isLoading?: boolean;
}

export default function VoiceSearchBar({ onSubmit, onImageSubmit, isLoading }: Props) {
  const {
    isRecording, isTranscribing, transcript, error: micError,
    startRecording, stopRecording, clearTranscript,
  } = useAudioRecorder();

  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Append voice transcript to input but DO NOT auto-submit
  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Compress image to base64 (max 1024px, 85% quality)
  const compressImage = (file: File): Promise<{ base64: string; mime: string; previewUrl: string }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const mime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.85);
        resolve({ base64: dataUrl.split(',')[1], mime, previewUrl: dataUrl });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError('Image must be under 10MB.'); return; }

    try {
      const { base64, mime, previewUrl } = await compressImage(file);
      setImagePreview(previewUrl);
      setImageBase64(base64);
      setImageMime(mime);
      setInputText('');
      // Focus text input so user can describe the food
      setTimeout(() => textInputRef.current?.focus(), 100);
    } catch {
      setImageError('Could not process the image.');
    }
    e.target.value = '';
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setInputText('');
    setImageError(null);
  };

  const handleAnalyzeImage = async () => {
    if (!imageBase64 || isLoading) return;
    try {
      const transcriptStr = await onImageSubmit(imageBase64, imageMime, inputText.trim());
      const newText = inputText.trim() ? `${inputText.trim()} - ${transcriptStr}` : transcriptStr;
      setInputText(newText);
      setImagePreview(null);
      setImageBase64('');
      setImageError(null);
    } catch (err: any) {
      setImageError(err.message || 'Analysis failed. Please try again.');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (imageBase64) { await handleAnalyzeImage(); return; }
    if (!inputText.trim()) return;
    
    try {
      await onSubmit(inputText.trim());
      setInputText('');
      setImageError(null);
    } catch (err: any) {
      setImageError(err.message || 'Analysis failed.');
    }
  };

  const hasImage = !!imagePreview;
  const error = micError || imageError;

  return (
    <div className="space-y-0">
      <form onSubmit={handleSubmit}>
        {/* ── Main search bar ── */}
        <div className={`flex w-full items-center overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-gray-800 ${
          hasImage
            ? 'rounded-b-none border-purple-400 dark:border-purple-600'
            : 'rounded-2xl border-gray-300 dark:border-gray-700'
        }`}>

          {/* Mic button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isLoading}
            title={isRecording ? 'Stop recording' : 'Voice input'}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400'
            }`}
          >
            {isTranscribing ? <img src="/loading_animation.webp" alt="Loading" className="h-6 w-6 object-contain" /> :
             isRecording   ? <Square className="h-4 w-4 fill-current" /> :
                             <Mic className="h-5 w-5" />}
          </button>

          {/* Photo attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isRecording || isTranscribing}
            title="Attach food photo"
            className={`flex h-12 w-10 flex-shrink-0 items-center justify-center transition-colors disabled:opacity-40 ${
              hasImage
                ? 'text-purple-500 dark:text-purple-400'
                : 'text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {/* Input area — shows image chip + text together */}
          <div className="flex flex-1 items-center gap-2 overflow-hidden pr-2">
            {/* Image thumbnail chip inside input bar */}
            {hasImage && imagePreview && (
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Attached food"
                  className="h-8 w-8 rounded-lg object-cover border-2 border-purple-400"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-red-500"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}

            <input
              ref={textInputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={
                hasImage
                  ? 'Describe what\'s in the photo (optional)...'
                  : isRecording
                  ? '🎙 Listening... click stop when done'
                  : isTranscribing
                  ? 'Transcribing your voice...'
                  : 'Log your meal or attach a food photo'
              }
              className={`h-12 w-full bg-transparent py-3 text-sm outline-none ${
                hasImage ? 'text-purple-700 placeholder-purple-400 dark:text-purple-200 dark:placeholder-purple-500' : 'text-gray-900 dark:text-white'
              }`}
              disabled={isRecording || isTranscribing || isLoading}
            />
          </div>

          {/* Send / Analyze button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !hasImage) || isLoading || isRecording || isTranscribing}
            title={hasImage ? 'Analyze food photo' : 'Analyze meal'}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center transition-colors disabled:opacity-40 ${
              hasImage
                ? 'text-purple-600 hover:text-purple-700 dark:text-purple-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {isLoading ? <img src="/loading_animation.webp" alt="Loading" className="h-6 w-6 object-contain" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        {/* ── Attached image diet card ── shown below the bar, connected */}
        {hasImage && (
          <div className="rounded-b-2xl border border-t-0 border-purple-400 bg-purple-50 px-4 py-3 dark:border-purple-600 dark:bg-purple-950/40">
            <div className="flex items-center gap-3">
              {/* Larger preview */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 border-purple-300 dark:border-purple-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview!} alt="Food" className="h-full w-full object-cover" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    Food photo ready for analysis
                  </span>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {inputText.trim()
                    ? `📝 "${inputText.trim()}"`
                    : 'Type food names above or click Analyze directly →'}
                </p>
              </div>

              {/* Analyze button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isLoading
                  ? <><img src="/loading_animation.webp" alt="Loading" className="h-4 w-4 object-contain" /> Analyzing...</>
                  : <><ImageIcon className="h-3.5 w-3.5" /> Analyze</>}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Error message */}
      {error && (
        <p className="mt-1 px-4 text-xs font-medium text-red-500 dark:text-red-400">⚠ {error}</p>
      )}
    </div>
  );
}
