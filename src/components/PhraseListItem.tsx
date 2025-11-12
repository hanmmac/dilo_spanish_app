"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface PhraseListItemProps {
  id: number;
  spanish: string;
  english: string;
  difficulty: "Easy" | "Medium" | "Hard";
  used: boolean;
  onToggleUsed: (id: number) => void;
  onOpenAlternatives: (phrase: { spanish: string; english: string }) => void;
}

export function PhraseListItem({
  id,
  spanish,
  english,
  difficulty,
  used,
  onToggleUsed,
  onOpenAlternatives,
}: PhraseListItemProps) {
  const difficultyColors = {
    Easy: "bg-emerald-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
    Medium: "bg-amber-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
    Hard: "bg-rose-500/30 text-white border-white/40 backdrop-blur-sm shadow-lg",
  };

  return (
    <div
      className={`group relative flex items-center gap-2 sm:gap-4 p-3 sm:p-5 bg-white/20 border border-white/30 rounded-2xl backdrop-blur-md hover:bg-white/30 transition-all duration-300 shadow-lg ${
        used ? "opacity-60" : ""
      }`}
    >
      <div className="flex-shrink-0">
        <Checkbox
          id={`used-${id}`}
          checked={used}
          onCheckedChange={() => onToggleUsed(id)}
          className="h-5 w-5 sm:h-6 sm:w-6 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-primary data-[state=checked]:border-white shadow-md"
        />
      </div>

      <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-8 items-center">
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-xs uppercase tracking-wider text-white/70 font-medium text-shadow-subtle">Spanish</p>
          <p className="text-lg sm:text-2xl font-bold leading-tight text-white font-serif text-shadow-strong">{spanish}</p>
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-xs uppercase tracking-wider text-white/70 font-medium text-shadow-subtle">English</p>
          <p className="text-sm sm:text-lg font-medium text-white/95 leading-tight text-shadow">{english}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${difficultyColors[difficulty]} text-xs px-2.5 py-1 font-medium text-shadow-subtle`}
          >
            {difficulty}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20 hover:text-white"
            onClick={() => onOpenAlternatives({ spanish, english })}
            title="View alternatives"
          >
            <Sparkles className="h-4 w-4 drop-shadow-md" />
          </Button>
        </div>
      </div>
    </div>
  );
}