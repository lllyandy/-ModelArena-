import React, { useState, useMemo } from 'react';
import { FolderUp, Play, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ModelConfig, TestCase, VideoSource, MediaType } from '../types';

interface BulkUploadZoneProps {
  models: ModelConfig[];
  mediaType: MediaType;
  onStartEvaluation: (queue: TestCase[]) => void;
}

// Helper to handle the non-standard webkitdirectory attribute in React
const DirectoryInput = ({ onChange }: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  return (
    <input
      type="file"
      multiple
      className="hidden"
      onChange={onChange}
      {...{ webkitdirectory: "", directory: "" } as any}
    />
  );
};

// Helper to remove extension from filename to allow matching .mp4 with .webm etc.
const getBaseName = (filename: string) => {
  return filename.replace(/\.[^/.]+$/, "");
};

export const BulkUploadZone: React.FC<BulkUploadZoneProps> = ({ models, mediaType, onStartEvaluation }) => {
  // Store files per model: modelId -> list of Files
  const [modelFiles, setModelFiles] = useState<Record<string, File[]>>({});

  const handleFolderSelect = (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const mimePrefix = mediaType === 'video' ? 'video/' : 'image/';
      
      // Filter for correct file type based on MIME or simplistic extension check if MIME is empty
      const validFiles = fileList.filter((f: any) => {
        if (f.type && f.type.startsWith(mimePrefix)) return true;
        // Fallback for when browser doesn't detect MIME type correctly (common with some containers)
        if (mediaType === 'video' && /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name)) return true;
        if (mediaType === 'image' && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)) return true;
        return false;
      }) as File[];
      
      setModelFiles(prev => ({
        ...prev,
        [modelId]: validFiles
      }));
    }
  };

  const removeFiles = (modelId: string) => {
    const newFiles = { ...modelFiles };
    delete newFiles[modelId];
    setModelFiles(newFiles);
  };

  // Calculate matching files across all uploaded models using Base Name (ignoring extension)
  const matches = useMemo(() => {
    const uploadedModelIds = Object.keys(modelFiles);
    if (uploadedModelIds.length < models.length) return [];

    // Get files for the first model as a baseline
    const firstModelFiles = modelFiles[models[0].id] || [];
    const commonBaseNames: string[] = [];
    
    // Set of base names found in first model to avoid duplicates
    const processedBaseNames = new Set<string>();

    firstModelFiles.forEach(file => {
      const baseName = getBaseName(file.name);
      
      if (processedBaseNames.has(baseName)) return;
      processedBaseNames.add(baseName);

      // Check if this baseName exists in all other models
      const existsInAll = models.every(m => {
        if (m.id === models[0].id) return true;
        return modelFiles[m.id]?.some(f => getBaseName(f.name) === baseName);
      });

      if (existsInAll) {
        commonBaseNames.push(baseName);
      }
    });

    return commonBaseNames.sort();
  }, [modelFiles, models]);

  const handleStart = () => {
    if (matches.length === 0) return;

    const queue: TestCase[] = matches.map((baseName, idx) => {
      const sources: VideoSource[] = models.map(m => {
        // Find the file with this base name
        const file = modelFiles[m.id].find(f => getBaseName(f.name) === baseName);
        
        return {
          modelId: m.id,
          file: file,
          name: file ? file.name : baseName // Keep original filename for reference
        };
      });

      return {
        id: `case-${idx}`,
        name: baseName, // Use base name as the case name for display
        sources
      };
    });

    onStartEvaluation(queue);
  };

  const isReady = matches.length > 0 && Object.keys(modelFiles).length === models.length;
  const labelText = mediaType === 'video' ? 'videos' : 'images';

  return (
    <div className="flex flex-col items-center justify-center p-6 animate-fade-in w-full max-w-6xl mx-auto">
      <div className="w-full mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Bulk {mediaType === 'video' ? 'Video' : 'Image'} Loader</h2>
        <p className="text-slate-400">Select a folder for each model. The system will match files by name (ignoring extensions).</p>
      </div>

      {/* Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-8">
        {models.map((model) => {
          const fileCount = modelFiles[model.id]?.length || 0;
          
          return (
            <div 
              key={model.id} 
              className={`relative group bg-slate-800 border-2 rounded-xl p-6 transition-all flex flex-col items-center text-center ${
                fileCount > 0
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-indigo-500/50'
              }`}
            >
              {/* Header */}
              <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: model.color }}></div>
                  <span className="font-semibold text-slate-200">{model.name}</span>
                </div>
                {fileCount > 0 && (
                   <button 
                     onClick={() => removeFiles(model.id)}
                     className="text-slate-500 hover:text-red-400 transition-colors p-1"
                   >
                     <X className="w-4 h-4" />
                   </button>
                )}
              </div>

              {/* Content */}
              {fileCount > 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-emerald-400">
                  <div className="relative">
                    <FolderUp className="w-12 h-12 mb-2 opacity-80" />
                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {fileCount}
                    </div>
                  </div>
                  <span className="text-sm font-medium">Folder Loaded</span>
                  <span className="text-xs text-emerald-500/70 mt-1">{fileCount} {labelText} found</span>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer py-4 w-full h-full">
                  <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors text-slate-400">
                    <FolderUp className="w-7 h-7" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">Select Folder</span>
                  <span className="text-xs text-slate-500 mt-1 px-4">Must contain {labelText} files</span>
                  <DirectoryInput onChange={(e) => handleFolderSelect(model.id, e)} />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary & Action */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 w-full flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {isReady ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {matches.length} Matches Found
            </h3>
            <p className="text-sm text-slate-400">
              {isReady 
                ? `Ready to compare ${matches.length} test cases across ${models.length} models.`
                : `Upload folders for all models to identify matching ${mediaType} files (ignoring extensions).`}
            </p>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!isReady}
          className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform ${
            isReady 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:-translate-y-1 shadow-emerald-500/30' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-6 h-6 fill-current" />
          Start Arena ({matches.length})
        </button>
      </div>
    </div>
  );
};