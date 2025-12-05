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
  verbs = [],
  onToggleUsed,
  onOpenAlternatives,
}: PhraseListItemProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported] = useState(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  });

  useEffect(() => {
    // Clean: stop speaking when component unmounts
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

  // Blacklist of common non-verb words that match verb patterns
  const NON_VERB_WORDS = new Set([
    // Articles & Pronouns
    "mas", "más", "las", "los", "que", "quien", "quienes", "cual", "cuales",
    "cuando", "donde", "cuanto", "cuanta", "cuantos", "cuantas",

    // Prepositions/Conjunctions (excluding "para" and "como" which can be verbs)
    "por", "pero", "hasta", "desde", "sobre", "bajo", "entre",
    "contra", "sin", "con", "hacia", "según", "durante", "mediante",

    // Demonstratives (excluding "está" which is a verb)
    "esta", "este", "estos", "estas", "eso", "esa", "esos", "esas",
    "aquel", "aquella", "aquellos", "aquellas",

    // Common nouns (plural)
    "ingredientes", "ingrediente", "personas", "persona", "cosas", "cosa",
    "casas", "casa", "mesas", "mesa", "manos", "mano", "ojos", "ojo",
    "pies", "pie", "cabezas", "cabeza", "platos", "plato", "bebidas", "bebida",
    "comidas", "comida", "ciudades", "ciudad", "países", "país",
    "amigos", "amigo", "amigas", "amiga",

    // Time/Date words
    "tiempo", "tiempos", "lugar", "lugares", "manera", "maneras",
    "dia", "día", "dias", "días", "año", "años", "mes", "meses",
    "vez", "veces", "hora", "horas", "minuto", "minutos", "segundo", "segundos",
    "semana", "semanas", "hoy", "ayer", "mañana", "tarde", "noche",

    // Adjectives
    "bueno", "buena", "buenos", "buenas", "malo", "mala", "malos", "malas",
    "grande", "grandes", "pequeño", "pequeña", "pequeños", "pequeñas",
    "rojo", "roja", "rojos", "rojas", "azul", "azules", "verde", "verdes",
    "blanco", "blanca", "blancos", "blancas", "negro", "negra", "negros", "negras",

    // Adverbs/Modifiers
    "menos", "muy", "tan", "tanto", "tanta", "tantos", "tantas",
    "siempre", "nunca", "ahora", "después", "antes",

    // Other common words
    "gente", "parte", "partes", "forma", "formas", "modo", "modos"
  ]);

  // Check if an ambiguous word is likely a verb based on context
  const isAmbiguousWordAVerb = (
    plainWord: string,
    tokens: Array<{ plain: string; isWord: boolean }>,
    index: number
  ): boolean => {
    const nextIndex = index + 1;
    const nextToken = tokens[nextIndex];

    // "para" - if followed by noun/article/infinitive, likely preposition (not verb)
    if (plainWord === "para") {
      if (nextToken?.isWord) {
        const nextPlain = nextToken.plain;
        // If followed by article (el, la, los, las, un, una) or infinitive ending, it's a preposition
        if (
          ["el", "la", "los", "las", "un", "una", "uno"].includes(nextPlain) ||
          (nextPlain.length >= 4 && (nextPlain.endsWith("ar") || nextPlain.endsWith("er") || nextPlain.endsWith("ir")))
        ) {
          return false; // It's a preposition, not a verb
        }
      }
      // Otherwise, could be a verb - let it through
      return true;
    }

    // "como" - if followed by noun/adjective/article, likely adverb (not verb)
    if (plainWord === "como") {
      if (nextToken?.isWord) {
        const nextPlain = nextToken.plain;
        // If followed by article, pronoun, or longer word (likely noun/adjective), it's an adverb
        if (
          ["el", "la", "los", "las", "un", "una", "tú", "él", "ella", "usted", "nosotros", "nosotras", "vosotros", "vosotras", "ellos", "ellas", "ustedes"].includes(nextPlain) ||
          nextPlain.length > 3 // Common nouns/adjectives are usually longer
        ) {
          return false; // It's an adverb, not a verb
        }
      }
      // Otherwise, could be a verb - let it through
      return true;
    }

    // Default: not an ambiguous word we're checking
    return true;
  };

  const baseVerbHeuristic = (
    plainWord: string,
    tokens?: Array<{ plain: string; isWord: boolean }>,
    index?: number
  ): boolean => {
    if (!plainWord || plainWord.length < 3) return false;

    // Check blacklist first
    if (NON_VERB_WORDS.has(plainWord)) return false;

    // Check ambiguous words with context
    if (tokens && index !== undefined && (plainWord === "para" || plainWord === "como")) {
      if (!isAmbiguousWordAVerb(plainWord, tokens, index)) {
        return false;
      }
    }

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

    // Normalize verbs array for comparison (handle diacritics and case)
    const normalizedVerbs = new Set(
      verbs.map((v) => stripDiacritics(v.toLowerCase().replace(/[.,!?;:¿¡]/g, "")))
    );

    // Check if a word is a verb using the AI-identified verbs array
    // Falls back to heuristics if verbs array is not available (backward compatibility)
    const isVerb = (token: typeof tokens[0], index: number): boolean => {
      if (!token.isWord) return false;

      // If we have AI-identified verbs, use those (most accurate)
      if (verbs.length > 0) {
        return normalizedVerbs.has(token.plain);
      }

      // Fallback to heuristics for backward compatibility with old phrases
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

      const plain = token.plain;

      // Check reflexive patterns
      if (isReflexiveInfinitive(plain) || hasAttachedReflexivePronoun(plain)) {
        return true;
      }

      const prevIndex = findPrevWordIndex(index - 1);
      if (
        prevIndex !== -1 &&
        REFLEXIVE_PRONOUNS.has(tokens[prevIndex].plain) &&
        baseVerbHeuristic(plain, tokens, index)
      ) {
        return true;
      }

      const nextIndex = findNextWordIndex(index + 1);
      if (nextIndex !== -1) {
        const nextPlain = tokens[nextIndex].plain;
        if (HABER_FORMS.has(plain) && isPastParticiple(nextPlain)) {
          return true;
        }
        if (ESTAR_FORMS.has(plain) && isGerund(nextPlain)) {
          return true;
        }
      }

      // Base heuristic check
      if (hasRedFlagSuffix(plain)) return false;
      return baseVerbHeuristic(plain, tokens, index);
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
            if (isVerb(token, index)) {
              return (
                <VerbConjugation key={index} verb={wordOnly}>
                  <span className="text-black font-semibold bg-white/50 px-0.5 py-0 rounded cursor-help inline-block leading-none">
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
      className={`group relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-white/30 border border-white/40 rounded-xl backdrop-blur-md hover:bg-white/40 transition-all duration-300 shadow-lg ${used ? "opacity-60" : ""
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