export type Difficulty = "Easy" | "Medium" | "Hard";

export interface PhraseAlternative {
  text: string;
  region: string;
  formality: string;
}

export interface Phrase {
  id: number;
  spanish: string;
  english: string;
  difficulty: Difficulty;
  used: boolean;
  formalWords?: Record<string, string>; // Maps informal words to formal equivalents
  alternatives?: PhraseAlternative[]; // Alternative ways to say the same phrase
}

export interface PhraseGenerationParams {
  region?: string;
  formality?: "formal" | "informal" | "neutral";
  count?: number;
  date?: string; // ISO date string for daily consistency
  recentPhrases?: string[]; // English phrases from recent days to avoid duplicates
}

export interface PhraseGenerationResponse {
  phrases: Phrase[];
  date: string;
  region: string;
  formality: string;
}


