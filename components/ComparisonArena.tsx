import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Star, ArrowRight, Flag, EyeOff } from 'lucide-react';
import { ModelConfig, TestCase, VoteResult, VideoRating, MediaType } from '../types';

interface ComparisonArenaProps {
  models: ModelConfig[];
  testCase: TestCase;
  currentCaseIndex: number;
  totalCases: number;
  mediaType: MediaType;
  isBlind: boolean;
  onNext: (result: VoteResult) => void;
}

// Fixed Palette for Blind Mode positions (Slot 1, Slot 2, ...) to differentiate visually without revealing identity
const BLIND_PALETTE = ['#3b82f6', '#f43f5e', '#eab308', '#22c55e', '#a855f7']; 

export const ComparisonArena: React.FC<ComparisonArenaProps> = ({ models, testCase, currentCaseIndex, totalCases, mediaType, isBlind, onNext }) => {
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Voting State
  const [ratings, setRatings] = useState<Record<string, VideoRating>>({});
  const [selectedWinner, setSelectedWinner] = useState<string | 'TIE' | null>(null);
  const [isRepresentative, setIsRepresentative] = useState(false);
  
  // Display State (for Blind Mode randomization)
  const [displayModels, setDisplayModels] = useState<ModelConfig[]>([]);

  // Refs
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [srcUrls, setSrcUrls] = useState<Record<string, string>>({});

  // Initialize/Reset for new case
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSelectedWinner(null);
    setIsRepresentative(false);
    
    // --- Randomization Logic ---
    if (isBlind) {
      // Shuffle copy of models
      const shuffled = [...models].sort(() => Math.random() - 0.5);
      setDisplayModels(shuffled);
    } else {
      setDisplayModels(models);
    }

    if (mediaType === 'video') {
      videoRefs.current.forEach(v => {
        if (v) v.playbackRate = playbackRate;
      });
    }

    const initialRatings: Record<string, VideoRating> = {};
    models.forEach(m => {
      initialRatings[m.id] = { score: 0, isAmazing: false, note: '' };
    });
    setRatings(initialRatings);

  }, [testCase, models, mediaType, isBlind]);

  // Load Blob URLs
  useEffect(() => {
    const urls: Record<string, string> = {};
    testCase.sources.forEach(src => {
      if (src.file) {
        urls[src.modelId] = URL.createObjectURL(src.file);
      } else if (src.url) {
        urls[src.modelId] = src.url;
      }
    });
    setSrcUrls(urls);

    return () => {
      testCase.sources.forEach(src => {
        if (src.file && urls[src.modelId]) {
          URL.revokeObjectURL(urls[src.modelId]);
        }
      });
    };
  }, [testCase]);

  // --- Synchronization Logic (Video Only) ---
  const togglePlay = () => {
    if (mediaType !== 'video') return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    videoRefs.current.forEach(video => {
      if (video) nextState ? video.play() : video.pause();
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (mediaType !== 'video') return;
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    videoRefs.current.forEach(video => {
      if (video) video.currentTime = time;
    });
  };

  const handleTimeUpdate = () => {
    if (mediaType !== 'video') return;
    // Find the first available video ref to drive time
    const activeRef = videoRefs.current.find(v => v !== null);
    if (activeRef) {
      setCurrentTime(activeRef.currentTime);
      if (!duration && activeRef.duration) {
        setDuration(activeRef.duration);
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (mediaType !== 'video') return;
    setPlaybackRate(rate);
    videoRefs.current.forEach(video => {
      if (video) video.playbackRate = rate;
    });
    setShowSpeedMenu(false);
  };

  const updateRating = (modelId: string, updates: Partial<VideoRating>) => {
    setRatings(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...updates }
    }));
  };

  const handleConfirm = () => {
    if (!selectedWinner) return;
    onNext({
      caseId: testCase.id,
      caseName: testCase.name,
      timestamp: Date.now(),
      winnerModelId: selectedWinner,
      ratings,
      duration,
      isRepresentative
    });
  };

  // --- Grid Calculation ---
  const gridClass = displayModels.length === 2 
    ? 'grid-cols-2' 
    : displayModels.length === 3 
      ? 'grid-cols-3' 
      : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-950 overflow-hidden">
      
      {/* Top Bar: Case Info */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Case</span>
            <span className="text-white font-bold font-mono text-sm">{currentCaseIndex + 1}<span className="text-slate-500 mx-0.5">/</span>{totalCases}</span>
          </div>
          <span className="text-slate-200 font-medium text-sm truncate">{testCase.name}</span>
          {isBlind && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              <EyeOff className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Blind</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Resizable Grid */}
      <div className="flex-1 min-h-0 p-4 flex items-center justify-center">
        <div className={`grid ${gridClass} gap-4 w-full h-full max-w-[1800px]`}>
          {displayModels.map((model, idx) => {
            const rating = ratings[model.id] || { score: 0, isAmazing: false, note: '' };
            const hasSource = !!srcUrls[model.id];
            
            // Masking Logic
            const displayName = isBlind ? `Option ${idx + 1}` : model.name;
            const displayColor = isBlind ? BLIND_PALETTE[idx % BLIND_PALETTE.length] : model.color;

            return (
              <div 
                key={model.id} 
                className={`flex flex-col rounded-lg overflow-hidden border-2 transition-all bg-black shadow-lg min-h-0 ${
                  selectedWinner === model.id 
                    ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'border-slate-800'
                }`}
              >
                {/* Media Area */}
                <div className="flex-1 relative bg-black min-h-0 group">
                  {/* Model Label */}
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded border border-white/10">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: displayColor, color: displayColor }}></div>
                    <span className="text-[10px] font-bold text-white uppercase">{displayName}</span>
                  </div>

                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                    {selectedWinner === model.id && (
                      <div className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow backdrop-blur">
                        WINNER
                      </div>
                    )}
                    {rating.isAmazing && (
                      <div className="bg-amber-500/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow backdrop-blur">
                        AMAZING
                      </div>
                    )}
                  </div>

                  {hasSource ? (
                    mediaType === 'video' ? (
                      <video
                        ref={(el) => { 
                          videoRefs.current[idx] = el;
                          if (el) el.playbackRate = playbackRate; 
                        }}
                        src={srcUrls[model.id]}
                        className="w-full h-full object-contain"
                        muted={isMuted}
                        loop
                        playsInline
                        onTimeUpdate={idx === 0 ? handleTimeUpdate : undefined}
                        onClick={togglePlay}
                      />
                    ) : (
                      <img 
                        src={srcUrls[model.id]}
                        alt={displayName}
                        className="w-full h-full object-contain select-none"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">No Source</div>
                  )}
                  
                  {/* Hover Play Button (Video Only) */}
                  {mediaType === 'video' && hasSource && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/10">
                      {!isPlaying && <Play className="w-12 h-12 text-white/50 fill-white/50" />}
                    </div>
                  )}
                </div>

                {/* Attached Scoring & Note Footer */}
                <div className="bg-slate-900 border-t border-slate-800 p-2 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {[0, 0.5, 1].map((scoreVal) => (
                          <button
                            key={scoreVal}
                            onClick={() => updateRating(model.id, { score: scoreVal as 0 | 0.5 | 1 })}
                            className={`w-10 h-6 flex items-center justify-center text-xs font-bold rounded transition-all ${
                              rating.score === scoreVal
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                          >
                            {scoreVal}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => updateRating(model.id, { isAmazing: !rating.isAmazing })}
                        className={`flex items-center gap-1 px-3 h-6 rounded text-[10px] font-bold border transition-all ${
                          rating.isAmazing
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-transparent border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${rating.isAmazing ? 'fill-current' : ''}`} />
                        WOW
                      </button>
                    </div>
                    
                    {/* Note Input */}
                    <textarea 
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-colors"
                      rows={2}
                      placeholder={`Note for ${displayName}...`}
                      value={rating.note || ''}
                      onChange={(e) => updateRating(model.id, { note: e.target.value })}
                      onKeyDown={(e) => e.stopPropagation()} 
                    />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Unified Control & Action Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
        <div className="max-w-[1800px] mx-auto flex items-center gap-6">
          
          {/* 1. Playback Controls (Video Only) */}
          {mediaType === 'video' ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay} 
                  className="bg-white hover:bg-indigo-50 text-slate-900 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-0.5 bg-slate-800 rounded-full p-0.5 border border-slate-700">
                  <button onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    videoRefs.current.forEach(v => v && (v.currentTime = 0));
                  }} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700" title="Reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  
                  <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700" title="Mute">
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Speed Control */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-colors w-[52px] justify-center"
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col min-w-[80px]">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`px-3 py-2 text-xs font-medium text-left hover:bg-indigo-500/20 hover:text-indigo-300 ${playbackRate === rate ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300'}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Timeline (Middle - Stretch) */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{currentTime.toFixed(1)}</span>
                <div className="relative flex-1 h-8 flex items-center group">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 hover:[&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
                  />
                </div>
                <span className="text-[10px] text-slate-600 font-mono w-8">{duration.toFixed(1)}</span>
              </div>
            </>
          ) : (
             // Image Mode Placeholder
             <div className="flex-1 flex items-center text-slate-500 text-sm font-medium">
                Image Comparison Mode
             </div>
          )}

          {/* 3. Decision Zone (Right) */}
          <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 hidden xl:inline">Winner:</span>
               {displayModels.map((m, idx) => {
                  const displayName = isBlind ? `Option ${idx + 1}` : m.name;
                  const displayColor = isBlind ? BLIND_PALETTE[idx % BLIND_PALETTE.length] : m.color;

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedWinner(m.id)}
                      className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                        selectedWinner === m.id
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedWinner === m.id ? 'bg-white' : ''}`} style={{ backgroundColor: selectedWinner === m.id ? undefined : displayColor }}></div>
                      <span className="truncate max-w-[80px]">{displayName}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedWinner('TIE')}
                  className={`h-9 px-3 rounded-lg text-xs font-bold transition-all border ${
                    selectedWinner === 'TIE'
                      ? 'bg-slate-600 border-slate-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Tie
                </button>
            </div>

             {/* Representative Toggle */}
            <button
              onClick={() => setIsRepresentative(!isRepresentative)}
              title="Mark as Representative Case"
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all border ${
                isRepresentative
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Flag className={`w-4 h-4 ${isRepresentative ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleConfirm}
              disabled={!selectedWinner}
              className={`h-10 pl-4 pr-5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                selectedWinner
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 hover:-translate-y-0.5'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {currentCaseIndex < totalCases - 1 ? 'Next Case' : 'Finish'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};