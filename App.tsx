import React, { useState } from 'react';
import { Download, Layers, ListChecks, ChevronRight, RotateCcw, Trophy, CheckCircle, Flag, Video, Loader2, FileArchive, Image as ImageIcon, EyeOff } from 'lucide-react';
import { SetupScreen } from './components/SetupScreen';
import { BulkUploadZone } from './components/BulkUploadZone';
import { ComparisonArena } from './components/ComparisonArena';
import { exportToExcel } from './utils/excelExport';
import { stitchMedia } from './utils/videoStitcher';
import { AppStage, ModelConfig, TestCase, VoteResult, MediaType } from './types';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>('SETUP');
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [isBlind, setIsBlind] = useState(false);
  
  // Queue State
  const [caseQueue, setCaseQueue] = useState<TestCase[]>([]);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [voteHistory, setVoteHistory] = useState<VoteResult[]>([]);
  
  // Processing State
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  const handleSetupComplete = (config: ModelConfig[], type: MediaType, blindMode: boolean) => {
    setModels(config);
    setMediaType(type);
    setIsBlind(blindMode);
    setStage('UPLOAD');
  };

  const handleStartQueue = (queue: TestCase[]) => {
    setCaseQueue(queue);
    setCurrentCaseIndex(0);
    setVoteHistory([]);
    setStage('ARENA');
  };

  const handleNextVote = (result: VoteResult) => {
    const newHistory = [...voteHistory, result];
    setVoteHistory(newHistory);

    if (currentCaseIndex < caseQueue.length - 1) {
      setCurrentCaseIndex(prev => prev + 1);
    } else {
      // Finished all cases
      setStage('RESULTS');
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset? All progress will be lost.")) {
      setStage('SETUP');
      setCaseQueue([]);
      setVoteHistory([]);
      setModels([]);
      setIsBlind(false);
    }
  };

  // Batch Export Representative Cases to ZIP
  const handleBatchExportZip = async () => {
    const repCases = voteHistory.filter(r => r.isRepresentative);
    if (repCases.length === 0) return;

    setIsProcessingZip(true);
    const zip = new JSZip();
    
    try {
      for (let i = 0; i < repCases.length; i++) {
        const result = repCases[i];
        const testCase = caseQueue.find(c => c.id === result.caseId);
        
        if (testCase) {
          setZipProgress(`Processing ${i + 1}/${repCases.length}: ${testCase.name}`);
          // Stitch the media
          const { blob, extension } = await stitchMedia(testCase.sources, models, mediaType, (msg) => {
             // finer grained status
          });
          
          // Add to zip
          const cleanName = testCase.name.replace(/\.[^/.]+$/, "");
          zip.file(`${cleanName}_comparison.${extension}`, blob);
        }
      }

      setZipProgress('Compressing archive...');
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Typical_Cases_${mediaType === 'video' ? 'Videos' : 'Images'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Batch export failed", e);
      alert("Failed to create batch export. Please try again.");
    } finally {
      setIsProcessingZip(false);
      setZipProgress('');
    }
  };

  // Filter representative cases
  const repCases = voteHistory.filter(r => r.isRepresentative);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ModelArena</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider font-semibold">
               <span className="flex items-center gap-1">
                 {mediaType === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                 {mediaType === 'video' ? 'Video' : 'Image'} Eval
               </span>
               {isBlind && (
                 <>
                   <span className="text-slate-600">|</span>
                   <span className="flex items-center gap-1 text-emerald-400">
                     <EyeOff className="w-3 h-3" />
                     Blind Mode
                   </span>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        {stage !== 'SETUP' && (
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-2 ${stage === 'UPLOAD' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className="w-6 h-6 rounded-full border flex items-center justify-center border-current text-xs">1</span>
              Load Batch
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700" />
            <div className={`flex items-center gap-2 ${stage === 'ARENA' ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
              <span className="w-6 h-6 rounded-full border flex items-center justify-center border-current text-xs">2</span>
              Evaluation ({currentCaseIndex + 1}/{caseQueue.length || '?'})
            </div>
            <ChevronRight className="w-4 h-4 text-slate-700" />
             <div className={`flex items-center gap-2 ${stage === 'RESULTS' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
               <ListChecks className="w-4 h-4" />
               <span>Results</span>
             </div>
          </div>
        )}

        {/* Stats & Export */}
        <div className="flex items-center gap-4">
          {stage !== 'SETUP' && (
             <button onClick={handleReset} className="text-slate-500 hover:text-red-400 transition-colors" title="Reset Session">
               <RotateCcw className="w-5 h-5" />
             </button>
          )}
          {(stage === 'RESULTS' || voteHistory.length > 0) && (
            <button 
              onClick={() => exportToExcel(voteHistory, models)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all animate-fade-in"
            >
              <Download className="w-4 h-4" />
              Export Excel ({voteHistory.length})
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {stage === 'SETUP' && (
          <SetupScreen onComplete={handleSetupComplete} />
        )}

        {stage === 'UPLOAD' && (
          <BulkUploadZone 
            models={models} 
            mediaType={mediaType}
            onStartEvaluation={handleStartQueue} 
          />
        )}

        {stage === 'ARENA' && caseQueue.length > 0 && (
          <ComparisonArena 
            models={models}
            testCase={caseQueue[currentCaseIndex]}
            currentCaseIndex={currentCaseIndex}
            totalCases={caseQueue.length}
            mediaType={mediaType}
            isBlind={isBlind}
            onNext={handleNextVote}
          />
        )}

        {stage === 'RESULTS' && (
          <div className="flex-1 overflow-auto bg-slate-900">
             <div className="max-w-6xl mx-auto p-8">
                
                {/* Main Results Card */}
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                       <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-white">Evaluation Complete</h2>
                    </div>
                    <p className="text-slate-400 text-lg">
                      Successfully evaluated <span className="text-white font-bold">{voteHistory.length}</span> {mediaType} cases.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                     <button
                        onClick={() => exportToExcel(voteHistory, models)}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-1"
                      >
                        <Download className="w-5 h-5" />
                        Download Report
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-all"
                      >
                        <RotateCcw className="w-5 h-5" />
                        New Session
                      </button>
                  </div>
                </div>

                {/* Representative Cases Section */}
                {repCases.length > 0 && (
                  <div className="animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2">
                      <div className="flex items-center gap-3">
                         <Flag className="w-5 h-5 text-purple-400" />
                         <h3 className="text-xl font-bold text-white">Representative Cases</h3>
                         <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">{repCases.length}</span>
                      </div>
                      
                      <button
                        onClick={handleBatchExportZip}
                        disabled={isProcessingZip}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg ${
                           isProcessingZip 
                           ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                           : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 hover:-translate-y-0.5'
                        }`}
                      >
                        {isProcessingZip ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {zipProgress || 'Processing...'}
                          </>
                        ) : (
                          <>
                            <FileArchive className="w-4 h-4" />
                            Download All Typical Cases (ZIP)
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {repCases.map(result => (
                        <div key={result.caseId} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col gap-3 group hover:border-purple-500/30 transition-colors">
                           <div className="flex justify-between items-start">
                             <span className="text-sm font-medium text-slate-200 truncate pr-2" title={result.caseName}>{result.caseName}</span>
                             <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">TYPICAL</span>
                           </div>
                           
                           <div className="text-xs text-slate-400">
                             Winner: <span className={result.winnerModelId === 'TIE' ? 'text-slate-300' : 'text-emerald-400 font-bold'}>
                               {result.winnerModelId === 'TIE' ? 'Tie' : models.find(m => m.id === result.winnerModelId)?.name}
                             </span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;