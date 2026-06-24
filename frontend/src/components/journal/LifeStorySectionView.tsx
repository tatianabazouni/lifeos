import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, Unlock, Check, ChevronRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTIONS,
  SECTION_PROMPTS,
  getSectionProgress,
  type LifeStorySection,
  type LifeStoryPrompt,
  type LifeStoryEntry,
} from "./lifeStoryTypes";

interface Props {
  section: LifeStorySection;
  entries: LifeStoryEntry[];
  onBack: () => void;
  onStartPrompt: (prompt: LifeStoryPrompt) => void;
}

const ringColors: Record<LifeStorySection, string> = {
  identity: "hsl(var(--primary))",
  past: "hsl(var(--amber))",
  emotions: "hsl(var(--secondary))",
  purpose: "hsl(var(--golden))",
  patterns: "hsl(var(--accent))",
  growth: "hsl(var(--growth))",
};

export default function LifeStorySectionView({ section, entries, onBack, onStartPrompt }: Props) {
  const meta = SECTIONS.find((s) => s.key === section)!;
  const prompts = SECTION_PROMPTS[section];
  const progress = getSectionProgress(entries, section);
  const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const color = ringColors[section];

  const answeredIds = new Set(
    entries.filter((e) => e.section === section && e.promptId).map((e) => e.promptId)
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Back to Life Story
      </Button>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-scrapbook p-8 relative overflow-hidden"
      >
        <span className="absolute right-4 bottom-2 text-8xl opacity-10" style={{ transform: "rotate(15deg)" }}>
          {meta.icon}
        </span>
        <div className="tape-effect" />
        <div className="relative z-10 pt-2 space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{meta.icon}</span>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                {meta.subtitle}
              </p>
              <h1 className="font-display text-3xl font-bold">{meta.title}</h1>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed max-w-xl">{meta.description}</p>

          {/* Progress */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <p className="text-sm font-medium whitespace-nowrap">
              {progress.completed}/{progress.total} complete
            </p>
          </div>
        </div>
      </motion.div>

      {/* Prompts */}
      <div className="space-y-3">
        {prompts.map((prompt, i) => {
          const isAnswered = answeredIds.has(prompt.id);
          const entry = entries.find((e) => e.promptId === prompt.id);

          return (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`surface-card p-5 cursor-pointer group transition-all ${
                isAnswered ? "border-l-4" : ""
              }`}
              style={isAnswered ? { borderLeftColor: color } : undefined}
              onClick={() => onStartPrompt(prompt)}
            >
              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    background: isAnswered ? color : "hsl(var(--muted) / 0.5)",
                    color: isAnswered ? "white" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {isAnswered ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-display text-lg font-semibold leading-snug">
                      {prompt.question}
                    </p>
                    {prompt.isDialogue && (
                      <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">
                        Mind vs Heart
                      </span>
                    )}
                  </div>

                  {/* Depth levels preview */}
                  <div className="flex items-center gap-2 mt-2">
                    {prompt.depthLevels.map((dl) => {
                      const entryDepth = entry?.depthLevel || 0;
                      const isUnlocked = dl.level <= (isAnswered ? entryDepth : 0);
                      return (
                        <div
                          key={dl.level}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: isUnlocked ? color : "hsl(var(--muted-foreground) / 0.4)" }}
                        >
                          {isUnlocked ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          <span>{dl.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Preview of written content */}
                  {isAnswered && entry && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 font-handwritten text-base">
                      {entry.content}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAnswered ? (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <PenLine className="h-3 w-3" /> Edit
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
