import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Target } from "lucide-react";
import type { OnboardingGoal } from "@/hooks/useOnboardingProgress";

interface Props {
  onComplete: (goal: OnboardingGoal) => void;
  onPrev: () => void;
}

export function StepCreateGoal({ onComplete, onPrev }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const canSubmit = title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || "",
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
          className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Target className="w-8 h-8 text-primary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-3xl text-foreground"
        >
          Set Your First Goal
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-md mx-auto"
        >
          Dreams become real when you turn them into goals. What's one thing you want to accomplish?
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 glass-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">What's your goal?</label>
          <Input
            placeholder="e.g., Read 12 books this year"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">How will you get there? (optional)</label>
          <Textarea
            placeholder="Break it down... what's the first small step?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-background/50 min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Target date (optional)</label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-background/50"
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
            Save Goal <Target className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
