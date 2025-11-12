"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface AlternativesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phrase: { spanish: string; english: string } | null;
  region: string;
}

const alternativesData: Record<
  string,
  Array<{ text: string; region: string; formality: string }>
> = {
  "¿Cómo estás?": [
    { text: "¿Qué tal?", region: "General", formality: "Informal" },
    { text: "¿Cómo te va?", region: "General", formality: "Informal" },
    { text: "¿Qué onda?", region: "Mexico", formality: "Very Informal" },
    { text: "¿Cómo andas?", region: "Argentina", formality: "Informal" },
  ],
  "Buenos días": [
    { text: "Buen día", region: "Argentina", formality: "Neutral" },
    { text: "Qué tal", region: "Spain", formality: "Informal" },
    { text: "Hola", region: "General", formality: "Neutral" },
  ],
};

export function AlternativesModal({
  open,
  onOpenChange,
  phrase,
  region,
}: AlternativesModalProps) {
  const alternatives = phrase ? alternativesData[phrase.spanish] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass border-white/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-serif text-2xl">
            <Sparkles className="h-5 w-5 text-white" />
            Other ways to say this
            <Badge variant="secondary" className="ml-auto font-mono text-xs bg-white/20 text-white border-white/30">
              AI 2.0
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Region-specific alternatives and variations
          </DialogDescription>
        </DialogHeader>

        {phrase && (
          <div className="space-y-4">
            <div className="p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
              <p className="text-lg font-semibold mb-1 text-white font-serif">{phrase.spanish}</p>
              <p className="text-sm text-white/80">{phrase.english}</p>
            </div>

            <div className="space-y-3">
              {alternatives.length > 0 ? (
                alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="p-3 border border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-white font-serif">{alt.text}</p>
                      <Badge
                        variant="outline"
                        className="text-xs whitespace-nowrap bg-white/10 text-white border-white/30"
                      >
                        {alt.region}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/70">
                      Formality: {alt.formality}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/70">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    No alternatives available for this phrase yet
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-center text-white/70 pt-2 border-t border-white/20">
              Your region preference: <strong className="text-white">{region}</strong>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}