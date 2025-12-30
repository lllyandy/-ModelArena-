import React, { useState, useCallback } from 'react';
import { Upload, Link, Play, X, FileVideo } from 'lucide-react';
import { ModelConfig, VideoSource } from '../types';

interface UploadZoneProps {
  models: ModelConfig[];
  onStartEvaluation: (sources: VideoSource[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ models, onStartEvaluation }) => {
  const [sources, setSources] = useState<Record<string, VideoSource>>({});
  const [inputType, setInputType] = useState<'file' | 'url'>('file');

  // Handle File Input
  const handleFileChange = (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSources(prev => ({
        ...prev,
        [modelId]: {
          modelId,
          file: file,
          name: file.name
        }
      }));
    }
  };

  // Handle URL Input
  const handleUrlChange = (modelId: string, url: string) => {
    setSources(prev => ({
      ...prev,
      [modelId]: {
        modelId,
        url: url,
        name: url
      }
    }));
  };

  const isReady = models.every(m => sources[m.id]);

  const handleStart = () => {
    if (isReady) {
      onStartEvaluation(Object.values(sources));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Load Comparison Videos</h2>
            <p className="text-slate-400">Upload a video for each model to begin this test case.</p>
          </div>
          
          <div className="bg-slate-800 p-1 rounded-lg flex text-sm font-medium">
            <button 
              onClick={() => setInputType('file')}
              className={`px-4 py-2 rounded-md transition-all ${inputType === 'file' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Local Files
            </button>
            <button 
              onClick={() => setInputType('url')}
              className={`px-4 py-2 rounded-md transition-all ${inputType === 'url' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              URLs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {models.map((model) => (
            <div 
              key={model.id} 
              className={`relative group bg-slate-800 border-2 rounded-xl p-6 transition-all ${
                sources[model.id] 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-indigo-500/50'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: model.color }}></div>
                  <span className="font-semibold text-slate-200">{model.name}</span>
                </div>
                {sources[model.id] && (
                   <button 
                     onClick={() => {
                       const newSources = {...sources};
                       delete newSources[model.id];
                       setSources(newSources);
                     }}
                     className="text-slate-500 hover:text-red-400 transition-colors"
                   >
                     <X className="w-4 h-4" />
                   </button>
                )}
              </div>

              {sources[model.id] ? (
                <div className="flex flex-col items-center justify-center py-8 text-emerald-400">
                  <FileVideo className="w-12 h-12 mb-2 opacity-80" />
                  <span className="text-sm text-center font-medium truncate w-full px-2">
                    {sources[model.id].name}
                  </span>
                </div>
              ) : (
                <div className="py-6">
                   {inputType === 'file' ? (
                     <label className="flex flex-col items-center cursor-pointer">
                       <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors text-slate-400">
                         <Upload className="w-6 h-6" />
                       </div>
                       <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Click to upload</span>
                       <input 
                         type="file" 
                         accept="video/*" 
                         className="hidden" 
                         onChange={(e) => handleFileChange(model.id, e)}
                       />
                     </label>
                   ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3 text-slate-400">
                         <Link className="w-6 h-6" />
                       </div>
                        <input 
                          type="text" 
                          placeholder="https://example.com/video.mp4"
                          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          onBlur={(e) => handleUrlChange(model.id, e.target.value)}
                        />
                      </div>
                   )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center">
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
            Start Evaluation
          </button>
        </div>
      </div>
    </div>
  );
};