import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plane, Briefcase, Palette, Dumbbell, Users, Heart, Star } from "lucide-react";
import type { OnboardingDream } from "@/hooks/useOnboardingProgress";

interface Props {
  onComplete: (dream: OnboardingDream) => void;
  onPrev: () => void;
}

const categories = [
  { id: "travel", label: "Travel", icon: Plane },
  { id: "career", label: "Career", icon: Briefcase },
  { id: "creativity", label: "Creativity", icon: Palette },
  { id: "health", label: "Health", icon: Dumbbell },
  { id: "relationships", label: "Relationships", icon: Users },
  { id: "love", label: "Love", icon: Heart },
];

export function StepCreateDream({ onComplete, onPrev }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const canSubmit = title.trim().length > 0 && category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      category,
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
          className="mx-auto w-16 h-16 rounded-full bg-golden/10 flex items-center justify-center"
        >
          <Star className="w-8 h-8 text-golden" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-3xl text-foreground"
        >
          Plant a Dream
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-md mx-auto"
        >
          What's something you've always wanted to do, become, or experience? Name it here — the first step toward making it real.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 glass-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">What's your dream?</label>
          <Input
            placeholder="e.g., Visit Japan, write a novel, run a marathon..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Why does it matter to you? (optional)</label>
          <Textarea
            placeholder="What would achieving this dream mean for your life?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-background/50 min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category</label>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all text-center ${
                    active
                      ? "bg-golden/15 ring-2 ring-golden shadow-glow-golden"
                      : "bg-muted/20 hover:bg-muted/30"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-golden" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
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
            Save Dream <Star className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
