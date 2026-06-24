import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTIONS,
  ENTRY_TYPES,
  getSectionProgress,
  type LifeStorySection,
  type EntryType,
  type LifeStoryEntry,
} from "./lifeStoryTypes";

interface LifeStoryHomeProps {
  entries: LifeStoryEntry[];
  onOpenSection: (section: LifeStorySection) => void;
  onStartEntry: (type: EntryType, section?: LifeStorySection) => void;
}

const sectionGradients: Record<LifeStorySection, string> = {
  identity: "from-primary/15 to-primary/5",
  past: "from-amber/15 to-amber/5",
  emotions: "from-secondary/15 to-secondary/5",
  purpose: "from-golden/15 to-golden/5",
  patterns: "from-accent/15 to-accent/5",
  growth: "from-growth/15 to-growth/5",
};

const sectionRingColors: Record<LifeStorySection, string> = {
  identity: "hsl(var(--primary))",
  past: "hsl(var(--amber))",
  emotions: "hsl(var(--secondary))",
  purpose: "hsl(var(--golden))",
  patterns: "hsl(var(--accent))",
  growth: "hsl(var(--growth))",
};

export default function LifeStoryHome({ entries, onOpenSection, onStartEntry }: LifeStoryHomeProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const totalEntries = entries.length;
  const totalWords = entries.reduce((s, e) => s + e.wordCount, 0);
  const deepestLevel = entries.length > 0 ? Math.max(...entries.map((e) => e.depthLevel)) : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 py-4"
      >
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Your Life Story
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
          A structured journey into self-understanding.
          <br />
          <span className="font-handwritten text-xl text-foreground/60">
            Write your life consciously.
          </span>
        </p>
      </motion.div>

      {/* Stats ribbon */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "Entries", value: totalEntries, icon: "📝" },
          { label: "Words Written", value: totalWords.toLocaleString(), icon: "✍️" },
          { label: "Deepest Level", value: deepestLevel > 0 ? `Level ${deepestLevel}` : "—", icon: "🔮" },
        ].map((stat, i) => (
          <div key={i} className="surface-card p-4 text-center">
            <span className="text-2xl">{stat.icon}</span>
            <p className="font-display text-2xl font-bold mt-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Section cards */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Feather className="h-5 w-5 text-primary" />
          Your Life Book
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((section, i) => {
            const progress = getSectionProgress(entries, section.key);
            const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
            const isHovered = hoveredSection === section.key;

            return (
              <motion.button
                key={section.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onMouseEnter={() => setHoveredSection(section.key)}
                onMouseLeave={() => setHoveredSection(null)}
                onClick={() => onOpenSection(section.key)}
                className={`relative text-left p-6 rounded-2xl border border-border/50 bg-gradient-to-br ${
                  sectionGradients[section.key]
                } transition-all duration-300 overflow-hidden group ${
                  isHovered ? "shadow-lifted -translate-y-1" : "shadow-depth"
                }`}
              >
                {/* Background icon */}
                <span
                  className="absolute -right-2 -bottom-2 text-7xl opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-15"
                  style={{ transform: "rotate(15deg)" }}
                >
                  {section.icon}
                </span>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{section.icon}</span>
                    <div>
                      <p className="font-display text-lg font-bold leading-tight">{section.title}</p>
                      <p className="text-xs text-muted-foreground font-medium">{section.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {section.description}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.completed}/{progress.total} prompts</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: sectionRingColors[section.key] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * i }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Begin exploring <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Entry type selector */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-golden" />
          Start Writing
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ENTRY_TYPES.map((et, i) => (
            <motion.button
              key={et.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + 0.05 * i }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onStartEntry(et.key)}
              className="surface-card p-4 text-left space-y-2 cursor-pointer"
            >
              <span className="text-2xl">{et.icon}</span>
              <p className="font-display text-sm font-bold">{et.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{et.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Growth insight */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="surface-scrapbook p-6 gradient-teal"
        >
          <div className="tape-effect" />
          <div className="flex items-start gap-4 pt-3">
            <TrendingUp className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-display font-bold">Your Growth Journey</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                You've written {totalWords.toLocaleString()} words across {totalEntries} entries.
                {deepestLevel >= 3
                  ? " You've reached the deepest level of self-exploration. Keep going — there's always more to discover."
                  : " Try going deeper on your next prompt — Level 3 questions reveal profound insights."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
