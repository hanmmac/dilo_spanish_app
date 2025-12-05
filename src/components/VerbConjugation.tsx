"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";

// Helper to get auth token for API requests
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

interface Conjugations {
  infinitive: string;
  meaning: string;
  type: "ar" | "er" | "ir";
  conjugations: {
    present?: Record<string, string>;
    preterite?: Record<string, string>;
    imperfect?: Record<string, string>;
    future?: Record<string, string>;
    conditional?: Record<string, string>;
    subjunctive_present?: Record<string, string>;
  };
}

interface VerbConjugationProps {
  verb: string;
  children: React.ReactNode;
}

export function VerbConjugation({ verb, children }: VerbConjugationProps) {
  const [conjugations, setConjugations] = useState<Conjugations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const fetchConjugations = useCallback(async () => {
    if (conjugations || loading) return; // Already fetched or loading

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(
        `/api/conjugate?verb=${encodeURIComponent(verb)}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view conjugations");
        }
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error("Failed to fetch conjugations");
      }

      const data = await response.json();
      
      // Check if we got valid conjugations
      if (data.error || !data.infinitive || !data.conjugations) {
        throw new Error(data.error || "Invalid verb");
      }
      
      setConjugations(data);
    } catch (err) {
      console.error("Error fetching conjugations:", err);
      setError("Failed to load conjugations");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verb]);

  const getTenseDefinition = (tense: string): string => {
    const definitions: Record<string, string> = {
      "Present": "happening now",
      "Preterite": "completed past action",
      "Imperfect": "ongoing past action",
      "Future": "will happen",
      "Conditional": "would happen",
      "Subjunctive Present": "doubt/desire/wish",
    };
    return definitions[tense] || "";
  };

  const renderConjugationTable = (_tense: string, forms: Record<string, string>) => {
    const pronouns = [
      "yo",
      "tú",
      "él/ella/usted",
      "nosotros/nosotras",
      "vosotros/vosotras",
      "ellos/ellas/ustedes",
    ];

    return (
      <div className="space-y-1">
        {pronouns.map((pronoun) => {
          const form = forms[pronoun];
          if (!form) return null;
          return (
            <div key={pronoun} className="flex justify-between text-xs">
              <span className="text-white/70">{pronoun}:</span>
              <span className="text-white font-semibold">{form}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const matchedUsage = useMemo(() => {
    if (!conjugations) return null;
    const normalize = (text: string) =>
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const normalizedVerb = normalize(verb);

    const entries = conjugations.conjugations || {};
    for (const [tenseKey, forms] of Object.entries(entries)) {
      if (!forms) continue;
      for (const [pronoun, form] of Object.entries(forms)) {
        if (normalize(form) === normalizedVerb) {
          return {
            tense: tenseKey,
            pronoun,
            form,
          };
        }
      }
    }

    return null;
  }, [conjugations, verb]);

  const formatTense = (tenseKey: string) =>
    tenseKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const renderTenseSection = (
    title: string,
    forms?: Record<string, string>
  ) => {
    if (!forms) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-white/60">{getTenseDefinition(title)}</p>
        {renderConjugationTable(title, forms)}
      </div>
    );
  };

  const matchedTenseName = matchedUsage ? formatTense(matchedUsage.tense) : null;

  // Fetch conjugations when popup opens (mobile only)
  useEffect(() => {
    if (isMobile && open && !conjugations && !loading) {
      fetchConjugations();
    }
  }, [isMobile, open, conjugations, loading, fetchConjugations]);

  const conjugationContent = (
    <>
      {loading && (
        <div className="text-sm text-white/70 py-4 text-center">Loading conjugations...</div>
      )}
      
      {error && (
        <div className="text-xs text-white/60 py-2 text-center italic">
          Not a verb
        </div>
      )}

      {conjugations && !loading && (
        <div className="space-y-5">
          <div className="pb-3 border-b border-white/15 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Word in phrase
            </p>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-2xl font-bold text-white font-serif">
                {verb}
              </h3>
              <span className="text-white/70 text-sm">
                {conjugations.infinitive} · {conjugations.type}
              </span>
            </div>
            {matchedUsage ? (
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {formatTense(matchedUsage.tense)}
                </p>
                <p className="text-white font-semibold">
                  {matchedUsage.pronoun} · {matchedUsage.form}
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/60">
                Couldn&apos;t detect the exact tense for this form.
              </p>
            )}
          </div>

          <div className="space-y-5">
            {matchedUsage && matchedTenseName && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">
                  {matchedTenseName}
                  <span className="text-white/60 font-normal">
                    {` · ${getTenseDefinition(matchedTenseName)}`}
                  </span>
                </p>
                {renderConjugationTable(
                  matchedTenseName,
                  conjugations.conjugations[
                    matchedUsage.tense as keyof typeof conjugations.conjugations
                  ]!
                )}
              </div>
            )}
            {matchedTenseName !== "Present" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">
                  Present
                  <span className="text-white/60 font-normal">
                    {` · ${getTenseDefinition("Present")}`}
                  </span>
                </p>
                {renderConjugationTable(
                  "Present",
                  conjugations.conjugations.present || {}
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // Use Popover on mobile (tap to open, tap outside to close)
  if (isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="glass-dark border-white/30 bg-black/90 text-white w-[360px] max-h-[500px] overflow-y-auto"
          side="top"
          align="start"
        >
          {conjugationContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Use HoverCard on desktop (hover to open)
  return (
    <HoverCard onOpenChange={(isOpen) => isOpen && fetchConjugations()}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="glass-dark border-white/30 bg-black/90 text-white w-[360px] max-h-[500px] overflow-y-auto"
        side="top"
        align="start"
      >
        {conjugationContent}
      </HoverCardContent>
    </HoverCard>
  );
}

