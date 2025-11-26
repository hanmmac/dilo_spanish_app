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

const REFLEXIVE_PRONOUNS = new Set(["me", "te", "se", "nos", "os"]);
const REFLEXIVE_SUFFIXES = ["me", "te", "se", "nos", "os"];
const RED_FLAG_SUFFIXES = [
  "cion",
  "sion",
  "xion",
  "dad",
  "tad",
  "tud",
  "mente",
  "encia",
  "ancia",
  "ador",
  "adora",
  "adores",
  "adoras",
  "ista",
];
const HABER_FORMS = new Set([
  "he",
  "has",
  "ha",
  "hay",
  "hemos",
  "habeis",
  "han",
  "habia",
  "habias",
  "habiamos",
  "habiais",
  "habian",
  "habre",
  "habras",
  "habra",
  "habremos",
  "habreis",
  "habran",
  "habria",
  "habrias",
  "habriamos",
  "habriais",
  "habrian",
  "hube",
  "hubiste",
  "hubo",
  "hubimos",
  "hubisteis",
  "hubieron",
  "haya",
  "hayas",
  "hayamos",
  "hayais",
  "hayan",
  "hubiera",
  "hubieras",
  "hubieramos",
  "hubierais",
  "hubieran",
  "hubiese",
  "hubieses",
  "hubiesemos",
  "hubieseis",
  "hubiesen",
]);
const ESTAR_FORMS = new Set([
  "estoy",
  "estas",
  "esta",
  "estamos",
  "estais",
  "estan",
  "estaba",
  "estabas",
  "estabamos",
  "estabais",
  "estaban",
  "estare",
  "estaras",
  "estara",
  "estaremos",
  "estareis",
  "estaran",
  "estaria",
  "estarias",
  "estariamos",
  "estariais",
  "estarian",
  "este",
  "estes",
  "estemos",
  "esteis",
  "esten",
]);
const IRREGULAR_PARTICIPLES = new Set([
  "abierto",
  "cubierto",
  "dicho",
  "escrito",
  "hecho",
  "muerto",
  "puesto",
  "resuelto",
  "roto",
  "visto",
  "vuelto",
  "devuelto",
  "descubierto",
  "impreso",
  "frito",
]);
const VERB_ENDINGS = [
  "amos",
  "ais",
  "as",
  "an",
  "emos",
  "eis",
  "es",
  "en",
  "imos",
  "is",
  "aste",
  "o",
  "asteis",
  "aron",
  "iste",
  "io",
  "isteis",
  "ieron",
  "aba",
  "abas",
  "abamos",
  "abais",
  "aban",
  "ia",
  "ias",
  "iamos",
  "iais",
  "ian",
  "are",
  "aras",
  "ara",
  "aremos",
  "areis",
  "aran",
  "ere",
  "eras",
  "era",
  "eremos",
  "ereis",
  "eran",
  "ire",
  "iras",
  "ira",
  "iremos",
  "ireis",
  "iran",
  "aria",
  "arias",
  "ariamos",
  "ariais",
  "arian",
  "eria",
  "erias",
  "eriamos",
  "eriais",
  "erian",
  "iria",
  "irias",
  "iriamos",
  "iriais",
  "irian",
  "ando",
  "iendo",
  "yendo",
  "ado",
  "ido",
];

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const baseVerbHeuristic = (plainWord: string): boolean => {
  if (!plainWord || plainWord.length < 3) return false;
  if (
    plainWord.length >= 4 &&
    (plainWord.endsWith("ar") || plainWord.endsWith("er") || plainWord.endsWith("ir"))
  ) {
    return true;
  }
  return VERB_ENDINGS.some((ending) => plainWord.endsWith(ending));
};

const hasRedFlagSuffix = (plainWord: string): boolean => {
  return RED_FLAG_SUFFIXES.some((suffix) => plainWord.endsWith(suffix));
};

const isReflexiveInfinitive = (plainWord: string): boolean => {
  return (
    plainWord.endsWith("se") &&
    (plainWord.endsWith("arse") || plainWord.endsWith("erse") || plainWord.endsWith("irse"))
  );
};

const hasAttachedReflexivePronoun = (plainWord: string): boolean => {
  for (const suffix of REFLEXIVE_SUFFIXES) {
    if (plainWord.length > suffix.length && plainWord.endsWith(suffix)) {
      const base = plainWord.slice(0, -suffix.length);
      if (baseVerbHeuristic(base)) {
        return true;
      }
    }
  }
  return false;
};

const isPastParticiple = (plainWord: string): boolean => {
  return (
    plainWord.endsWith("ado") ||
    plainWord.endsWith("ido") ||
    IRREGULAR_PARTICIPLES.has(plainWord)
  );
};

const isGerund = (plainWord: string): boolean => {
  return (
    plainWord.endsWith("ando") ||
    plainWord.endsWith("iendo") ||
    plainWord.endsWith("yendo")
  );
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

  // Split Spanish text into words and create hoverable spans for words with formal alternatives or verbs
  const renderSpanishWithTooltips = () => {
    // Split text while preserving punctuation and spaces
    const words = spanish.split(/(\s+|[.,!?;:¿¡])/);
    const tokens = words.map((raw) => {
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      const normalized = lower.replace(/[.,!?;:¿¡]/g, "");
      const plain = stripDiacritics(normalized);
      return {
        raw,
        lower,
        normalized,
        plain,
        isWord: plain.length > 0,
      };
    });

    const findPrevWordIndex = (start: number): number => {
      for (let i = start; i >= 0; i--) {
        if (tokens[i]?.isWord) return i;
      }
      return -1;
    };

    const findNextWordIndex = (start: number): number => {
      for (let i = start; i < tokens.length; i++) {
        if (tokens[i]?.isWord) return i;
      }
      return -1;
    };

    const strongVerbIndices = new Set<number>();

    tokens.forEach((token, index) => {
      if (!token.isWord) return;
      const plain = token.plain;

      if (isReflexiveInfinitive(plain) || hasAttachedReflexivePronoun(plain)) {
        strongVerbIndices.add(index);
      } else {
        const prevIndex = findPrevWordIndex(index - 1);
        if (
          prevIndex !== -1 &&
          REFLEXIVE_PRONOUNS.has(tokens[prevIndex].plain) &&
          baseVerbHeuristic(plain)
        ) {
          strongVerbIndices.add(index);
        }
      }

      const nextIndex = findNextWordIndex(index + 1);
      if (nextIndex !== -1) {
        const nextPlain = tokens[nextIndex].plain;
        if (HABER_FORMS.has(plain) && isPastParticiple(nextPlain)) {
          strongVerbIndices.add(nextIndex);
        }
        if (ESTAR_FORMS.has(plain) && isGerund(nextPlain)) {
          strongVerbIndices.add(nextIndex);
        }
      }
    });

    const isLikelyVerb = (plainWord: string, index: number): boolean => {
      if (!plainWord) return false;
      if (strongVerbIndices.has(index)) return true;
      if (hasRedFlagSuffix(plainWord)) return false;
      return baseVerbHeuristic(plainWord);
    };

    return (
      <TooltipProvider>
        <span>
          {tokens.map((token, index) => {
            const word = token.raw;
            if (!token.isWord) {
              return <span key={index}>{word}</span>;
            }
            const wordOnly = token.normalized || token.plain;

            // Check for formal version first
            const formalVersion = formalWords && Object.entries(formalWords).find(
              ([informal]) => informal.toLowerCase() === token.lower
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
            if (isLikelyVerb(token.plain, index)) {
              return (
                <VerbConjugation key={index} verb={wordOnly}>
                  <span className="text-black font-semibold underline decoration-white decoration-2 decoration-dotted cursor-help">
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
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-black/60 font-medium">
              Spanish
            </p>
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
          <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-tight text-black font-serif">
            {renderSpanishWithTooltips()}
          </p>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-black/60 font-medium">
            English
          </p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-black/90 leading-tight">
            {english}
          </p>
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