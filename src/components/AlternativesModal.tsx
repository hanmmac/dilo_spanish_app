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
import { PhraseAlternative } from "@/types/phrase";

interface AlternativesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phrase: { spanish: string; english: string; alternatives?: PhraseAlternative[] } | null;
  region: string;
}

export function AlternativesModal({
  open,
  onOpenChange,
  phrase,
  region,
}: AlternativesModalProps) {
  const alternatives = phrase?.alternatives || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-dark border-white/30 bg-black/80 backdrop-blur-xl">
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

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {alternatives.length > 0 ? (
                alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="p-4 border border-white/30 rounded-xl bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-sm shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-white font-serif text-lg">
                          {alt.text}
                        </p>
                        {alt.english && (
                          <p className="text-sm text-white/75">
                            {alt.english}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs whitespace-nowrap bg-white/20 text-white border-white/40 flex-shrink-0"
                      >
                        {alt.region}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/80 font-medium">
                      Formality: <span className="text-white">{alt.formality}</span>
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