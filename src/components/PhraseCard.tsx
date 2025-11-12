"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface PhraseCardProps {
  id: number;
  spanish: string;
  english: string;
  difficulty: "Easy" | "Medium" | "Hard";
  used: boolean;
  onToggleUsed: (id: number) => void;
  onOpenAlternatives: (phrase: { spanish: string; english: string }) => void;
}

export function PhraseCard({
  id,
  spanish,
  english,
  difficulty,
  used,
  onToggleUsed,
  onOpenAlternatives,
}: PhraseCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const difficultyColors = {
    Easy: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    Hard: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-md ${
        used ? "opacity-60" : ""
      }`}
    >
      <div
        className="cursor-pointer select-none p-6"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flex items-start justify-between mb-4">
          <Badge
            variant="outline"
            className={`${difficultyColors[difficulty]} font-mono text-xs px-2 py-0.5`}
          >
            {difficulty}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAlternatives({ spanish, english });
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">AI 2.0</span>
          </Button>
        </div>

        <div className="min-h-[80px] flex items-center justify-center mb-4">
          {!isFlipped ? (
            <p className="text-2xl font-semibold text-center leading-relaxed">
              {spanish}
            </p>
          ) : (
            <p className="text-xl text-muted-foreground text-center leading-relaxed">
              {english}
            </p>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {isFlipped ? "Tap to see Spanish" : "Tap to reveal translation"}
        </p>
      </div>

      <div
        className="border-t px-6 py-3 bg-muted/30 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          id={`used-${id}`}
          checked={used}
          onCheckedChange={() => onToggleUsed(id)}
        />
        <label
          htmlFor={`used-${id}`}
          className="text-sm font-medium cursor-pointer select-none"
        >
          Used aloud today
        </label>
      </div>
    </Card>
  );
}
