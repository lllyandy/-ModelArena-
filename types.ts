
export interface ModelConfig {
  id: string;
  name: string;
  color: string;
}

export type MediaType = 'video' | 'image';

export interface VideoSource {
  modelId: string;
  file?: File;
  url?: string;
  name: string; // Display name (filename)
}

export interface TestCase {
  id: string;
  name: string; // Common filename
  sources: VideoSource[];
}

export interface VideoRating {
  score: 0 | 0.5 | 1;
  isAmazing: boolean;
  note?: string; // Optional text note for specific observations
}

export interface VoteResult {
  caseId: string;
  caseName: string;
  timestamp: number;
  winnerModelId: string | 'TIE'; 
  ratings: Record<string, VideoRating>; // modelId -> rating
  duration?: number;
  isRepresentative: boolean; // New field for typical case marking
}

export type AppStage = 'SETUP' | 'UPLOAD' | 'ARENA' | 'RESULTS';