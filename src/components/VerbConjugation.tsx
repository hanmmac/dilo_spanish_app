"use client";

import { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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

  const fetchConjugations = async () => {
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
  };

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

  const renderConjugationTable = (tense: string, forms: Record<string, string>) => {
    const pronouns = [
      "yo",
      "tú",
      "él/ella/usted",
      "nosotros/nosotras",
      "vosotros/vosotras",
      "ellos/ellas/ustedes",
    ];

    const tenseName = tense.replace("_", " ");
    const definition = getTenseDefinition(tenseName);

    return (
      <div className="mb-3 last:mb-0">
        <div className="mb-1.5">
          <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wide">
            {tenseName}
          </h4>
          {definition && (
            <p className="text-[10px] text-white/50 italic mt-0.5">
              {definition}
            </p>
          )}
        </div>
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
      </div>
    );
  };

  return (
    <HoverCard onOpenChange={(open) => open && fetchConjugations()}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="glass-dark border-white/30 bg-black/90 text-white w-80 max-h-[500px] overflow-y-auto"
        side="top"
        align="start"
      >
        {loading && (
          <div className="text-sm text-white/70 py-4 text-center">Loading conjugations...</div>
        )}
        
        {error && (
          <div className="text-xs text-white/60 py-2 text-center italic">
            Not a verb
          </div>
        )}

        {conjugations && !loading && (
          <div>
            <div className="mb-3 pb-2 border-b border-white/20">
              <h3 className="text-base font-bold text-white font-serif">
                {conjugations.infinitive}
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                {conjugations.meaning} ({conjugations.type})
              </p>
            </div>

            <div className="space-y-2">
              {conjugations.conjugations.present &&
                renderConjugationTable("Present", conjugations.conjugations.present)}
              {conjugations.conjugations.preterite &&
                renderConjugationTable("Preterite", conjugations.conjugations.preterite)}
              {conjugations.conjugations.imperfect &&
                renderConjugationTable("Imperfect", conjugations.conjugations.imperfect)}
              {conjugations.conjugations.future &&
                renderConjugationTable("Future", conjugations.conjugations.future)}
              {conjugations.conjugations.conditional &&
                renderConjugationTable("Conditional", conjugations.conjugations.conditional)}
              {conjugations.conjugations.subjunctive_present &&
                renderConjugationTable("Subjunctive Present", conjugations.conjugations.subjunctive_present)}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

