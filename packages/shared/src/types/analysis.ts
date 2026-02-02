
export type MoveQuality = 'excellent' | 'good' | 'questionable' | 'blunder';

export interface MoveQualityEvaluation {
  moveNumber: number;
  quality: MoveQuality;
  score: number; // 0-100
  reason: string; // Brief explanation (e.g., "Captured 2 stones")
  details?: {
    capturedStones?: number;
    savedGroup?: boolean;
    missedCapture?: boolean;
    createdWeakGroup?: boolean;
  };
}
