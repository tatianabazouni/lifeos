/**
 * EmptyVault — Shown when no memories exist.
 * Storytelling-focused empty state with emotional messaging.
 */
import { motion } from "framer-motion";
import { Plus, Sparkles, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyVault({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[450px] text-center gap-6 relative overflow-hidden"
    >
      {/* Floating decorative elements */}
      <motion.div
        animate={{ y: [-5, 5, -5], x: [-3, 3, -3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 left-1/4 opacity-10"
      >
        <Heart className="h-12 w-12 text-accent" />
      </motion.div>
      <motion.div
        animate={{ y: [3, -6, 3], x: [2, -2, 2] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-12 right-1/4 opacity-10"
      >
        <BookOpen className="h-10 w-10 text-primary" />
      </motion.div>

      {/* Animated capsule icon */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center border border-primary/10">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-2 border-primary/20"
        />
        {/* Second ring */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          className="absolute inset-0 rounded-full border border-accent/15"
        />
      </motion.div>

      <div className="space-y-3 max-w-md">
        <h3 className="font-display text-2xl font-bold text-foreground">
          Your first memory awaits
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          Start your story today. Preserve the moments, people, and milestones 
          that shaped who you are.
        </p>
        <p className="font-handwritten text-lg text-muted-foreground/50 italic">
          "We do not remember days, we remember moments."
        </p>
      </div>

      <Button
        onClick={onAdd}
        className="gradient-primary text-primary-foreground shadow-md rounded-xl"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Your First Memory
      </Button>
    </motion.div>
  );
}
