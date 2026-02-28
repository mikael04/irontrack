import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, FileText, Clipboard, RefreshCw, Merge } from 'lucide-react';
import { parseCSV } from '../utils/csv';
import { WorkoutRaw, ImportMode } from '../types';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { useTranslation } from 'react-i18next';

interface ImportScreenProps {
  onImport: (data: WorkoutRaw[], mode: ImportMode) => void;
  hasExistingWorkouts: boolean;
}

// Helper: Decode Base64 to UTF-8 String (Vital for Portuguese accents)
const decodeBase64 = (base64: string): string => {
  try {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error("Base64 decode failed", e);
    return window.atob(base64); // Fallback (might break accents)
  }
};

export const ImportScreen: React.FC<ImportScreenProps> = ({ onImport, hasExistingWorkouts }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pendingData, setPendingData] = useState<WorkoutRaw[] | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const { t } = useTranslation();

  const processImport = async (input: File | string) => {
    setError(null);
    setIsProcessing(true);
    try {
      const data = await parseCSV(input);
      if (data.length === 0) {
        setError('No valid exercises found. Please check your CSV headers (Semana, Dia, Exercício...).');
      } else if (hasExistingWorkouts) {
        setPendingData(data);
        setShowMergeModal(true);
        setIsProcessing(false);
      } else {
        onImport(data, 'replace');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to parse CSV. Please use the Paste option if the file fails.');
      setIsProcessing(false);
    }
  };

  // -- LOGIC: Web / Standard File Input --
  const handleWebFile = (file: File) => {
    const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
    const isTxtExtension = file.name.toLowerCase().endsWith('.txt');

    if (!isCsvExtension && !isTxtExtension) {
      setError('Please upload a .csv or .txt file.');
      return;
    }
    processImport(file);
  };

  // -- LOGIC: Native File Picker --
  const pickNativeFile = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const result = await FilePicker.pickFiles({
        types: ['text/csv', 'text/plain', 'application/vnd.ms-excel', '*/*'],
        limit: 1,
        readData: true,
      });

      const file = result.files[0];
      if (!file || !file.data) {
        throw new Error("No file selected or empty data.");
      }

      // Decode properly to handle accents
      const csvContent = decodeBase64(file.data);

      // Pass the string content to processor
      await processImport(csvContent);

    } catch (err: any) {
      console.error("Native File Pick Error:", err);

      // Filter out "User cancelled" errors
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return;
      }

      // Show actual error message for debugging
      const msg = err?.message || 'Unknown error';
      setError(`Import failed: ${msg}. Try the "Paste CSV" button.`);

      setIsProcessing(false);
    }
  };

  // -- LOGIC: Drag & Drop --
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => {
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleWebFile(e.dataTransfer.files[0]);
    }
  };

  // -- LOGIC: Click Handler --
  const handleUploadClick = () => {
    if (Capacitor.isNativePlatform()) {
      pickNativeFile();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-16 pb-12 px-4 relative overflow-y-auto">

      {/* Header */}
      <div className="text-center mb-8 shrink-0">
        <div className="bg-gym-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gym-accent/20">
          <FileSpreadsheet size={32} className="text-gym-accent" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('import_title')}</h1>
        <p className="text-gym-500 max-w-sm mx-auto">
          {t('import_desc')}
        </p>
      </div>

      {/* Main Upload Box */}
      <div
        onClick={handleUploadClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
      w-full max-w-md p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
      flex flex-col items-center justify-center gap-4 group shrink-0
      ${isDragging
            ? 'border-gym-accent bg-gym-accent/5 scale-[1.02]'
            : 'border-gym-700 bg-gym-800/50 hover:border-gym-600 hover:bg-gym-800'
          }
      `}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.txt"
          onChange={(e) => e.target.files && handleWebFile(e.target.files[0])}
        />

        <div className={`
        p-4 rounded-full bg-gym-900 transition-colors
        ${isDragging ? 'text-gym-accent' : 'text-gym-400 group-hover:text-white'}
        `}>
          <Upload size={28} />
        </div>

        <div className="text-center">
          <span className="font-semibold text-white">{t('import_button')}</span>
          <div className="text-gym-500 text-sm mt-1">
            {Capacitor.isNativePlatform() ? "Select a file from device" : "or drag and drop"}
          </div>
        </div>
      </div>

      {/* OR Divider */}
      <div className="flex items-center w-full max-w-md my-6 shrink-0">
        <div className="flex-grow h-px bg-gym-800"></div>
        <span className="px-4 text-gym-600 text-sm font-medium">OR</span>
        <div className="flex-grow h-px bg-gym-800"></div>
      </div>

      {/* Paste Option (Fail-safe) */}
      <button
        onClick={() => setShowPasteModal(true)}
        className="shrink-0 flex items-center space-x-2 text-gym-400 hover:text-white transition-colors bg-gym-800/50 px-6 py-3 rounded-xl border border-gym-700 hover:border-gym-600 mb-8"
      >
        <Clipboard size={18} />
        <span>Paste CSV Text Directly</span>
      </button>

      {/* Processing State */}
      {isProcessing && (
        <div className="mt-6 flex items-center space-x-2 text-gym-accent animate-pulse">
          <span className="text-sm font-medium">Processing workout data...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3 max-w-md animate-in slide-in-from-bottom-2">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-sm text-red-200 break-all">{error}</p>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gym-900 border border-gym-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-full">
            <div className="p-4 border-b border-gym-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-gym-accent" />
                Paste CSV Data
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-gym-500 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex-grow overflow-hidden flex flex-col">
              <p className="text-sm text-gym-400 mb-3 shrink-0">
                Copy the content of your CSV file and paste it below.
              </p>
              <textarea
                className="w-full flex-grow bg-gym-950 border border-gym-700 rounded-lg p-3 text-xs font-mono text-gym-300 focus:outline-none focus:border-gym-accent resize-none"
                placeholder="Semana,Dia,Foco,Exercício...&#10;1,A,Push,Bench Press..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-gym-800 bg-gym-900/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-lg text-gym-400 hover:text-white hover:bg-gym-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!pasteContent.trim()}
                onClick={() => {
                  setShowPasteModal(false);
                  processImport(pasteContent);
                }}
                className="px-4 py-2 rounded-lg bg-gym-accent hover:bg-gym-accentHover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge/Replace Confirmation Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gym-900 border border-gym-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gym-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <RefreshCw size={18} className="text-gym-accent" />
                Import New Training Plan
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gym-300 mb-6">
                You already have a training plan loaded. How would you like to proceed?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    if (pendingData) {
                      onImport(pendingData, 'replace');
                      setPendingData(null);
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
                      <RefreshCw size={18} className="text-gym-400 group-hover:text-gym-accent" />
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-1">{t('replace_training')}</div>
                      <div className="text-xs text-gym-500">
                        {t('replace_desc')}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    if (pendingData) {
                      onImport(pendingData, 'merge');
                      setPendingData(null);
                    }
                  }}
                  className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
                      <Merge size={18} className="text-gym-400 group-hover:text-gym-accent" />
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-1">{t('merge_training')}</div>
                      <div className="text-xs text-gym-500">
                        {t('merge_desc')}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setPendingData(null);
                }}
                className="mt-6 w-full px-4 py-2 rounded-lg text-gym-400 hover:text-white hover:bg-gym-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
