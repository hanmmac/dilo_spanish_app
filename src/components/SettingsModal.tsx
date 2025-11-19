"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: string;
  onRegionChange: (region: string) => void;
  formalOnly: boolean;
  onFormalOnlyChange: (value: boolean) => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  region,
  onRegionChange,
  formalOnly,
  onFormalOnlyChange,
}: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-dark border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white font-serif text-2xl text-shadow-strong">Settings</DialogTitle>
          <DialogDescription className="text-white/90 text-shadow">
            Customize your learning experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="region" className="text-white text-shadow">Spanish Region</Label>
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger id="region" className="bg-white/20 border-white/30 text-white backdrop-blur-md text-shadow">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent className="glass-dark border-white/20 bg-black/70">
                {/* <SelectItem value="spain" className="text-white">Spain (Castilian)</SelectItem> */}
                {/* <SelectItem value="mexico" className="text-white">Mexico</SelectItem> */}
                {/* <SelectItem value="argentina" className="text-white">Argentina</SelectItem> */}
                {/* <SelectItem value="colombia" className="text-white">Colombia</SelectItem> */}
                {/* <SelectItem value="caribbean" className="text-white">Caribbean</SelectItem> */}
                {/* <SelectItem value="general" className="text-white">General/Neutral</SelectItem> */}
                <SelectItem value="costa-rica" className="text-white">Costa Rica</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/80 text-shadow-subtle">
              Learn phrases specific to your region
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="formal-mode" className="text-white text-shadow">Formal Mode</Label>
              <p className="text-xs text-white/80 text-shadow-subtle">
                Show only formal (usted) forms
              </p>
            </div>
            <Switch
              id="formal-mode"
              checked={formalOnly}
              onCheckedChange={onFormalOnlyChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}