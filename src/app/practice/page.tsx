"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PracticePanel } from "@/components/PracticePanel";

// Standalone practice route (the same panel is also used as a slide-out on home).
function PracticeRoute() {
  const sp = useSearchParams();
  const targetPhrase = sp.get("phrase");
  const targetEnglish = sp.get("english");

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex h-screen max-w-md flex-col">
        <div className="flex items-center justify-end p-3">
          <Link
            href="/practice/sessions"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <BarChart3 className="h-4 w-4" />
            Admin
          </Link>
        </div>
        <div className="min-h-0 flex-1">
          <PracticePanel targetPhrase={targetPhrase} targetEnglish={targetEnglish} />
        </div>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeRoute />
    </Suspense>
  );
}
