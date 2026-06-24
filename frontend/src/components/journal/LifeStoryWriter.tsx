import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Lock,
  Sparkles,
  Heart,
  Brain,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SECTIONS,
  QUICK_REFLECTIONS,
  type LifeStoryPrompt,
  type LifeStoryEntry,
  type EntryType,
  type LifeStorySection,
} from "./lifeStoryTypes";

interface Props {
  entryType: EntryType;
  prompt?: LifeStoryPrompt;
  section?: LifeStorySection;
  existingEntry?: LifeStoryEntry;
  onSave: (entry: LifeStoryEntry) => void;
  onBack: () => void;
}

const MOODS = [
  { emoji: "😌", label: "Calm" },
  { emoji: "💪", label: "Strong" },
  { emoji: "😢", label: "Tender" },
  { emoji: "🔥", label: "Fired Up" },
  { emoji: "🌊", label: "Flowing" },
  { emoji: "🌙", label: "Reflective" },
  { emoji: "☀️", label: "Hopeful" },
  { emoji: "🫣", label: "Vulnerable" },
];

export default function LifeStoryWriter({
  entryType,
  prompt,
  section,
  existingEntry,
  onSave,
  onBack,
}: Props) {
  const [title, setTitle] = useState(existingEntry?.title || "");
  const [content, setContent] = useState(existingEntry?.content || "");
  const [heartContent, setHeartContent] = useState(existingEntry?.heartContent || "");
  const [mood, setMood] = useState(existingEntry?.mood || "");
  const [depthLevel, setDepthLevel] = useState(existingEntry?.depthLevel || 1);
  const [showDialogue, setShowDialogue] = useState(prompt?.isDialogue || false);
  const [saved, setSaved] = useState(false);
  const [activeVoice, setActiveVoice] = useState<"mind" | "heart">("mind");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const sectionMeta = section ? SECTIONS.find((s) => s.key === section) : undefined;
  const currentDepth = prompt?.depthLevels.find((d) => d.level === depthLevel);
  const wordCount = (content + " " + heartContent).trim().split(/\s+/).filter(Boolean).length;

  const isReflection = entryType === "reflection";
  const isFreewrite = entryType === "freewrite";

  useEffect(() => {
    if (contentRef.current) contentRef.current.focus();
  }, [depthLevel]);

  const handleSave = () => {
    const entry: LifeStoryEntry = {
      id: existingEntry?.id || `ls-${Date.now()}`,
      type: entryType,
      section,
      promptId: prompt?.id,
      title: title || (prompt?.question ?? "Untitled"),
      content,
      heartContent: showDialogue ? heartContent : undefined,
      mood,
      depthLevel,
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
      wordCount,
    };
    onSave(entry);
    setSaved(true);
    setTimeout(() => onBack(), 1200);
  };

  const goDeeper = () => {
    if (prompt && depthLevel < prompt.depthLevels.length) {
      setDepthLevel((d) => d + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Saved overlay */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "hsl(var(--background) / 0.95)" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
              >
                <Check className="h-10 w-10 text-primary" />
              </motion.div>
              <p className="font-display text-2xl font-bold">Saved to your story</p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-handwritten text-xl text-golden"
              >
                +{wordCount} words of self-discovery ✨
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {wordCount} words
            </span>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || !mood}
              className="gradient-primary text-primary-foreground rounded-xl shadow-depth"
            >
              Save to your story <Sparkles className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Section badge */}
        {sectionMeta && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span className="text-lg">{sectionMeta.icon}</span>
            <span className="font-medium">{sectionMeta.title}</span>
            <span>·</span>
            <span>{sectionMeta.subtitle}</span>
          </motion.div>
        )}

        {/* Prompt question */}
        {prompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-scrapbook p-6 relative overflow-hidden"
          >
            <div className="tape-effect" />
            <p className="font-display text-2xl font-bold leading-snug pt-2">
              "{prompt.question}"
            </p>

            {/* Depth indicator */}
            <div className="flex items-center gap-3 mt-4">
              {prompt.depthLevels.map((dl) => {
                const isActive = dl.level === depthLevel;
                const isLocked = dl.level > depthLevel;
                return (
                  <button
                    key={dl.level}
                    disabled={isLocked}
                    onClick={() => setDepthLevel(dl.level)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-depth"
                        : isLocked
                        ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {isLocked ? <Lock className="h-3 w-3" /> : null}
                    Level {dl.level}: {dl.label}
                  </button>
                );
              })}
            </div>

            {currentDepth && (
              <motion.p
                key={depthLevel}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-muted-foreground mt-3 italic"
              >
                {currentDepth.question}
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={prompt ? prompt.question : "Title your reflection..."}
          className="w-full font-display text-2xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/30"
        />

        {/* Inner dialogue toggle */}
        {prompt?.isDialogue && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowDialogue(false); setActiveVoice("mind"); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                !showDialogue ? "bg-secondary/10 text-secondary" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <Brain className="h-3 w-3" /> Single voice
            </button>
            <button
              onClick={() => setShowDialogue(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                showDialogue ? "bg-accent/10 text-accent" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <Heart className="h-3 w-3" /> Mind vs Heart
            </button>
          </div>
        )}

        {/* Writing area */}
        {showDialogue ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mind */}
            <motion.div
              layout
              className={`space-y-2 p-4 rounded-2xl border transition-all ${
                activeVoice === "mind"
                  ? "border-secondary/30 bg-secondary/5"
                  : "border-border/30"
              }`}
              onClick={() => setActiveVoice("mind")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4 text-secondary" />
                <span>Mind speaks</span>
              </div>
              <Textarea
                ref={activeVoice === "mind" ? contentRef : undefined}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What does your rational mind say..."
                className="min-h-[200px] border-0 resize-none focus-visible:ring-0 bg-transparent font-handwritten text-lg leading-8"
              />
            </motion.div>

            {/* Heart */}
            <motion.div
              layout
              className={`space-y-2 p-4 rounded-2xl border transition-all ${
                activeVoice === "heart"
                  ? "border-accent/30 bg-accent/5"
                  : "border-border/30"
              }`}
              onClick={() => setActiveVoice("heart")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Heart className="h-4 w-4 text-accent" />
                <span>Heart speaks</span>
              </div>
              <Textarea
                ref={activeVoice === "heart" ? contentRef : undefined}
                value={heartContent}
                onChange={(e) => setHeartContent(e.target.value)}
                placeholder="What does your heart truly feel..."
                className="min-h-[200px] border-0 resize-none focus-visible:ring-0 bg-transparent font-handwritten text-lg leading-8"
              />
            </motion.div>
          </div>
        ) : (
          <div className="surface-notebook rounded-2xl p-4">
            <Textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                isFreewrite
                  ? "Let your thoughts flow freely..."
                  : isReflection
                  ? "How was your day? What stood out?"
                  : "Write your reflection..."
              }
              className="min-h-[300px] border-0 resize-none focus-visible:ring-0 bg-transparent font-handwritten text-lg leading-8"
            />
          </div>
        )}

        {/* Quick reflection prompts */}
        {isReflection && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick prompts</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REFLECTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05, rotate: 0 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setContent((c) => (c ? c + "\n\n" + q + "\n" : q + "\n"));
                    contentRef.current?.focus();
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-handwritten text-base shadow-sm cursor-pointer"
                  style={{
                    background: "hsl(48 80% 90%)",
                    color: "hsl(35 30% 25%)",
                    transform: `rotate(${((i * 7) % 5) - 2}deg)`,
                  }}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Go deeper button */}
        {prompt && depthLevel < prompt.depthLevels.length && content.trim().length > 20 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <Button
              variant="outline"
              onClick={goDeeper}
              className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
            >
              Go deeper <ChevronRight className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">
                Level {depthLevel + 1}: {prompt.depthLevels[depthLevel]?.label}
              </span>
            </Button>
          </motion.div>
        )}

        {/* Mood selector */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">How does this make you feel?</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const isSelected = mood === m.label;
              return (
                <motion.button
                  key={m.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                  onClick={() => setMood(m.label)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary/30 shadow-glow-primary font-medium"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <span>{m.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
