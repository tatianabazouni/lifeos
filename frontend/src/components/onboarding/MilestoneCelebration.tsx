import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, PartyPopper } from "lucide-react";

interface Props {
  message: string;
  emoji?: string;
  onDone: () => void;
}

export function MilestoneCelebration({ message, emoji, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 30}%`,
                  backgroundColor: [
                    "hsl(155 45% 43%)",
                    "hsl(44 100% 66%)",
                    "hsl(228 67% 41%)",
                    "hsl(338 100% 39%)",
                  ][i % 4],
                }}
                initial={{ opacity: 0, y: -20, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [0, 100 + Math.random() * 200],
                  x: [-30 + Math.random() * 60],
                  scale: [0, 1, 0.8, 0],
                  rotate: [0, 360 + Math.random() * 360],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: 0.2 + Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center space-y-4 p-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-6xl mx-auto"
            >
              {emoji || "✨"}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Milestone Unlocked</span>
              </div>
              <p className="font-display text-2xl md:text-3xl text-foreground max-w-sm">
                {message}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
