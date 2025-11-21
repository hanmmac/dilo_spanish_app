"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { Phrase } from "@/types/phrase";
import { VerbConjugation } from "./VerbConjugation";

interface PhraseListItemProps extends Omit<Phrase, "id" | "used"> {
  id: number;
  used: boolean;
  onToggleUsed: (id: number) => void;
  onOpenAlternatives: (phrase: { spanish: string; english: string; alternatives?: Phrase["alternatives"] }) => void;
}

export function PhraseListItem({
  id,
  spanish,
  english,
  difficulty,
  used,
  formalWords = {},
  alternatives = [],
  onToggleUsed,
  onOpenAlternatives,
}: PhraseListItemProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported] = useState(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  });

  useEffect(() => {
    // Cleanup: stop speaking when component unmounts
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const difficultyColors = {
    Easy: "bg-emerald-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
    Medium: "bg-amber-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
    Hard: "bg-rose-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
  };

  const speakPhrase = () => {
    if (!speechSupported) return;

    // Stop any currently speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(spanish);
    utterance.lang = 'es-CR'; // Costa Rican Spanish (falls back to es-MX or es-ES if not available)
    utterance.rate = 0.75; // Slower for better clarity and learning
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Check if a word looks like a Spanish verb
  const isLikelyVerb = (word: string): boolean => {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord.length < 3) return false;

    // Remove punctuation
    const wordOnly = cleanWord.replace(/[.,!?;:¿¡]/g, "");

    // Check for infinitive endings (most reliable)
    if (wordOnly.endsWith("ar") || wordOnly.endsWith("er") || wordOnly.endsWith("ir")) {
      // Make sure it's not a common noun ending (like "casa", "libro")
      if (wordOnly.length >= 4) {
        return true;
      }
    }

    // Check for more specific conjugated verb endings (avoid single letter endings that are too common)
    const verbEndings = [
      // Present tense -ar verbs (longer endings first to avoid false positives)
      "amos", "áis", "as", "an",
      // Present tense -er verbs
      "emos", "éis", "es", "en",
      // Present tense -ir verbs
      "imos", "ís",
      // Preterite endings
      "aste", "ó", "amos", "asteis", "aron",
      "iste", "ió", "imos", "isteis", "ieron",
      // Imperfect endings
      "aba", "abas", "ábamos", "abais", "aban",
      "ía", "ías", "íamos", "íais", "ían",
      // Future endings
      "aré", "arás", "ará", "aremos", "aréis", "arán",
      "eré", "erás", "erá", "eremos", "eréis", "erán",
      "iré", "irás", "irá", "iremos", "iréis", "irán",
      // Conditional
      "aría", "arías", "aríamos", "aríais", "arían",
      "ería", "erías", "eríamos", "eríais", "erían",
      "iría", "irías", "iríamos", "iríais", "irían",
    ];

    return verbEndings.some((ending) => wordOnly.endsWith(ending));
  };

  // Split Spanish text into words and create hoverable spans for words with formal alternatives or verbs
  const renderSpanishWithTooltips = () => {
    // Split text while preserving punctuation and spaces
    const words = spanish.split(/(\s+|[.,!?;:¿¡])/);
    
    return (
      <TooltipProvider>
        <span>
          {words.map((word, index) => {
            const cleanWord = word.trim().toLowerCase();
            const wordOnly = cleanWord.replace(/[.,!?;:¿¡]/g, "");
            
            // Check for formal version first
            const formalVersion = formalWords && Object.entries(formalWords).find(
              ([informal]) => informal.toLowerCase() === cleanWord
            )?.[1];

            if (formalVersion) {
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <span className="border-b border-dashed border-white/50 cursor-help hover:border-white/80 transition-colors">
                      {word}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="glass-dark border-white/30 bg-black/80 text-white">
                    <p className="text-sm">
                      <span className="text-white/70">Formal: </span>
                      <span className="font-semibold">{formalVersion}</span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            // Check if it's a verb
            if (isLikelyVerb(wordOnly)) {
              return (
                <VerbConjugation key={index} verb={wordOnly}>
                  <span className="border-b border-dotted border-blue-400/60 cursor-help hover:border-blue-400/90 transition-colors text-blue-200/90 hover:text-blue-100">
                    {word}
                  </span>
                </VerbConjugation>
              );
            }

            return <span key={index}>{word}</span>;
          })}
        </span>
      </TooltipProvider>
    );
  };

  return (
    <div
      className={`group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-white/20 border border-white/30 rounded-xl backdrop-blur-md hover:bg-white/30 transition-all duration-300 shadow-lg ${
        used ? "opacity-60" : ""
      }`}
    >
      <div className="flex-shrink-0">
        <Checkbox
          id={`used-${id}`}
          checked={used}
          onCheckedChange={() => onToggleUsed(id)}
          className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-primary data-[state=checked]:border-white shadow-md"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-row gap-2 sm:gap-3 md:gap-4 lg:gap-6 items-center">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/70 font-medium text-shadow-subtle">Spanish</p>
            {speechSupported && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                onClick={isSpeaking ? stopSpeaking : speakPhrase}
                title={isSpeaking ? "Stop pronunciation" : "Listen to pronunciation"}
              >
                {isSpeaking ? (
                  <VolumeX className="h-3 w-3 sm:h-3.5 sm:w-3.5 drop-shadow-md" />
                ) : (
                  <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 drop-shadow-md" />
                )}
              </Button>
            )}
          </div>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-tight text-white font-serif text-shadow-strong">
            {renderSpanishWithTooltips()}
          </p>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white/70 font-medium text-shadow-subtle">English</p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-white/95 leading-tight text-shadow">{english}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${difficultyColors[difficulty]} text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 font-medium text-shadow-subtle whitespace-nowrap`}
          >
            {difficulty}
          </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 opacity-80 hover:opacity-100 transition-opacity text-white hover:bg-white/20 hover:text-white flex-shrink-0"
                onClick={() => onOpenAlternatives({ spanish, english, alternatives })}
                title="View alternatives"
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 drop-shadow-md" />
              </Button>
        </div>
      </div>
    </div>
  );
}