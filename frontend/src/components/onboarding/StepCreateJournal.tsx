import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, BookOpen, Sun, Smile, Cloud, Meh, Frown } from "lucide-react";
import type { OnboardingJournalEntry } from "@/hooks/useOnboardingProgress";

interface Props {
  onComplete: (entry: OnboardingJournalEntry) => void;
  onPrev: () => void;
}

const moods = [
  { id: "great", label: "Great", icon: Sun, color: "text-golden" },
  { id: "good", label: "Good", icon: Smile, color: "text-primary" },
  { id: "okay", label: "Okay", icon: Cloud, color: "text-calm" },
  { id: "meh", label: "Meh", icon: Meh, color: "text-muted-foreground" },
  { id: "low", label: "Low", icon: Frown, color: "text-accent" },
];

export function StepCreateJournal({ onComplete, onPrev }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");

  const canSubmit = content.trim().length > 0 && mood;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      id: crypto.randomUUID(),
      title: title.trim() || `Journal Entry — ${new Date().toLocaleDateString()}`,
      content: content.trim(),
      mood,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-16 h-16 rounded-full bg-calm/10 flex items-center justify-center"
        >
          <BookOpen className="w-8 h-8 text-calm" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-3xl text-foreground"
        >
          Write Your First Page
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-md mx-auto font-handwritten text-lg"
        >
          "Every life is a story. This is where you begin writing yours."
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 glass-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">How are you feeling right now?</label>
          <div className="flex justify-center gap-3">
            {moods.map((m) => {
              const Icon = m.icon;
              const active = mood === m.id;
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ scale: 1.15, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMood(m.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    active ? "glass-card shadow-glow-primary ring-2 ring-primary" : "hover:bg-muted/20"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${active ? "text-primary" : m.color}`} />
                  <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {m.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Title (optional)</label>
          <Input
            placeholder="e.g., A new beginning..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">What's on your mind?</label>
          <Textarea
            placeholder="Write freely... this is your space."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-background/50 min-h-[120px] surface-notebook"
          />
        </div>
      </motion.div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onPrev} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2 gradient-primary text-primary-foreground"
          >
            Save Entry <BookOpen className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
