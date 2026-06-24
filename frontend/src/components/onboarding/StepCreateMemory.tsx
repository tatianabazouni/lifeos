import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Camera, Sparkles } from "lucide-react";
import type { OnboardingMemory } from "@/hooks/useOnboardingProgress";

interface Props {
  onComplete: (memory: OnboardingMemory) => void;
  onPrev: () => void;
}

export function StepCreateMemory({ onComplete, onPrev }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const tagOptions = ["childhood", "family", "travel", "achievement", "turning point", "friendship"];

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      date: date || new Date().toISOString().split("T")[0],
      tags,
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
          className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center"
        >
          <Camera className="w-8 h-8 text-accent" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-3xl text-foreground"
        >
          Your First Memory
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-md mx-auto"
        >
          Think of a moment that shaped who you are. It could be a childhood memory, a turning point, or simply something you never want to forget.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 glass-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">What's this memory about?</label>
          <Input
            placeholder="e.g., The day I graduated..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Describe this moment</label>
          <Textarea
            placeholder="Close your eyes and remember... what do you see, feel, hear?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-background/50 min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">When did it happen?</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tags (optional)</label>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  tags.includes(tag)
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
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
            Save Memory <Sparkles className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
