"use client";

import { Home, Bookmark, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  activeTab: "home" | "saved" | "settings";
  onTabChange: (tab: "home" | "saved" | "settings") => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="glass border-y border-white/20 backdrop-blur-xl sticky top-[73px] z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        <nav className="flex items-center justify-center gap-2">
          <Button
            variant={activeTab === "home" ? "secondary" : "ghost"}
            size="sm"
            className={`gap-2 ${
              activeTab === "home"
                ? "bg-white/30 text-white hover:bg-white/40 backdrop-blur-md text-shadow"
                : "text-white/90 hover:bg-white/20 hover:text-white text-shadow-subtle"
            }`}
            onClick={() => onTabChange("home")}
          >
            <Home className="h-4 w-4 drop-shadow-md" />
            <span>Home</span>
          </Button>
          <Button
            variant={activeTab === "saved" ? "secondary" : "ghost"}
            size="sm"
            className={`gap-2 ${
              activeTab === "saved"
                ? "bg-white/30 text-white hover:bg-white/40 backdrop-blur-md text-shadow"
                : "text-white/90 hover:bg-white/20 hover:text-white text-shadow-subtle"
            }`}
            onClick={() => onTabChange("saved")}
          >
            <Bookmark className="h-4 w-4 drop-shadow-md" />
            <span>Saved</span>
          </Button>
          <Button
            variant={activeTab === "settings" ? "secondary" : "ghost"}
            size="sm"
            className={`gap-2 ${
              activeTab === "settings"
                ? "bg-white/30 text-white hover:bg-white/40 backdrop-blur-md text-shadow"
                : "text-white/90 hover:bg-white/20 hover:text-white text-shadow-subtle"
            }`}
            onClick={() => onTabChange("settings")}
          >
            <Settings className="h-4 w-4 drop-shadow-md" />
            <span>Settings</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}