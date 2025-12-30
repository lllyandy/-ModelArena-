import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, Settings, Video, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { ModelConfig, MediaType } from '../types';
import { MODEL_COLORS, MAX_MODELS, MIN_MODELS } from '../constants';

interface SetupScreenProps {
  onComplete: (models: ModelConfig[], mediaType: MediaType, isBlind: boolean) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [isBlind, setIsBlind] = useState(false);
  const [models, setModels] = useState<ModelConfig[]>([
    { id: 'm1', name: 'Baseline (v1.0)', color: MODEL_COLORS[0] },
    { id: 'm2', name: 'Experimental (v1.1)', color: MODEL_COLORS[1] },
  ]);

  const addModel = () => {
    if (models.length < MAX_MODELS) {
      const idx = models.length;
      setModels([
        ...models,
        { id: `m${Date.now()}`, name: `Model ${String.fromCharCode(65 + idx)}`, color: MODEL_COLORS[idx % MODEL_COLORS.length] }
      ]);
    }
  };

  const removeModel = (index: number) => {
    if (models.length > MIN_MODELS) {
      const newModels = [...models];
      newModels.splice(index, 1);
      setModels(newModels);
    }
  };

  const updateName = (index: number, name: string) => {
    const newModels = [...models];
    newModels[index].name = name;
    setModels(newModels);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] max-w-2xl mx-auto p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Session Setup</h2>
            <p className="text-slate-400 text-sm">Configure evaluation type and models.</p>
          </div>
        </div>

        {/* Media Type & Blind Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label className="text-sm font-semibold text-slate-400 mb-3 block">Evaluation Type</label>
            <div className="flex bg-slate-900 p-1 rounded-xl">
              <button
                onClick={() => setMediaType('video')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  mediaType === 'video'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                onClick={() => setMediaType('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                  mediaType === 'image'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-400 mb-3 block">Evaluation Mode</label>
            <button
              onClick={() => setIsBlind(!isBlind)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                isBlind
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {isBlind ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                <span className="font-bold text-sm">{isBlind ? 'Blind Evaluation' : 'Standard Mode'}</span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${isBlind ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isBlind ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
            <p className="text-xs text-slate-500 mt-2 ml-1">
              {isBlind ? 'Model names hidden, order randomized.' : 'Model names and colors visible.'}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <label className="text-sm font-semibold text-slate-400 block">Model Versions ({models.length})</label>
          {models.map((model, idx) => (
            <div key={model.id} className="flex items-center gap-3 animate-fade-in">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                style={{ backgroundColor: model.color }}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <input
                type="text"
                value={model.name}
                onChange={(e) => updateName(idx, e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="Enter model name..."
              />
              <button
                onClick={() => removeModel(idx)}
                disabled={models.length <= MIN_MODELS}
                className={`p-3 rounded-lg transition-colors ${
                  models.length <= MIN_MODELS 
                    ? 'text-slate-600 cursor-not-allowed' 
                    : 'text-slate-400 hover:bg-red-500/20 hover:text-red-400'
                }`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button
            onClick={addModel}
            disabled={models.length >= MAX_MODELS}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              models.length >= MAX_MODELS
                ? 'text-slate-500 cursor-not-allowed'
                : 'text-indigo-400 hover:bg-indigo-500/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Model
          </button>

          <button
            onClick={() => onComplete(models, mediaType, isBlind)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-0.5"
          >
            Start Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};