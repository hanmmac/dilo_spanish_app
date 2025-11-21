"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const prevCompletedRef = useRef(completed);
  const percentage = Math.round((completed / total) * 100);

  useEffect(() => {
    const previousCompleted = prevCompletedRef.current;

    if (completed > previousCompleted && completed === total) {
      // Trigger confetti when all tasks are completed
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#ffffff", "#fbbf24", "#f59e0b", "#fb923c"],
      });
    }
    prevCompletedRef.current = completed;
  }, [completed, total]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Your Progress</span>
        <span className="text-sm font-mono text-white/80">
          {completed} / {total} phrases
        </span>
      </div>
      <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className="h-full bg-gradient-to-r from-white via-white/90 to-white/80 transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          {percentage > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
}