import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingParticles } from "@/components/FloatingParticles";
import { StepCreateMemory } from "@/components/onboarding/StepCreateMemory";
import { StepCreateJournal } from "@/components/onboarding/StepCreateJournal";
import { StepCreateDream } from "@/components/onboarding/StepCreateDream";
import { StepCreateGoal } from "@/components/onboarding/StepCreateGoal";
import { MilestoneCelebration } from "@/components/onboarding/MilestoneCelebration";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import {
  BookOpen, ArrowRight, Sparkles, Star, Camera, Target,
} from "lucide-react";

const TOTAL_STEPS = 6;

const stepLabels = [
  { icon: BookOpen, label: "Welcome" },
  { icon: Camera, label: "Memory" },
  { icon: BookOpen, label: "Journal" },
  { icon: Star, label: "Dream" },
  { icon: Target, label: "Goal" },
  { icon: Sparkles, label: "Ready" },
];

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { saveMemory, saveJournalEntry, saveDream, saveGoal, finishOnboarding } = useOnboardingProgress();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [celebration, setCelebration] = useState<{ message: string; emoji: string } | null>(null);

  const next = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const celebrateThen = useCallback((msg: string, emoji: string, cb: () => void) => {
    setCelebration({ message: msg, emoji });
    // cb runs after celebration dismisses
    const wrapped = () => {
      cb();
      setCelebration(null);
    };
    // Store for the onDone callback
    (window as any).__onboardingCelebrationCb = wrapped;
  }, []);

  const handleCelebrationDone = useCallback(() => {
    const cb = (window as any).__onboardingCelebrationCb;
    if (cb) {
      cb();
      delete (window as any).__onboardingCelebrationCb;
    }
  }, []);

  const finish = useCallback(() => {
    finishOnboarding();
    navigate("/dashboard");
  }, [finishOnboarding, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Celebration overlay */}
      {celebration && (
        <MilestoneCelebration
          message={celebration.message}
          emoji={celebration.emoji}
          onDone={handleCelebrationDone}
        />
      )}

      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.05), hsl(228 67% 41% / 0.03))",
            "linear-gradient(225deg, hsl(220 20% 97%), hsl(44 100% 66% / 0.05), hsl(155 45% 43% / 0.04))",
            "linear-gradient(315deg, hsl(220 20% 97%), hsl(338 100% 39% / 0.04), hsl(228 67% 41% / 0.03))",
            "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.05), hsl(228 67% 41% / 0.03))",
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <FloatingParticles count={12} colors={["primary", "golden", "calm"]} />

      {/* Progress bar with labels */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {stepLabels.map((s, i) => {
          const Icon = s.icon;
          const isActive = i + 1 === step;
          const isDone = i + 1 < step;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isDone
                    ? "hsl(155 45% 43%)"
                    : isActive
                    ? "hsl(155 45% 43% / 0.15)"
                    : "hsl(220 15% 88%)",
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                transition={{ duration: 0.3 }}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isDone ? "text-primary-foreground" : isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </motion.div>
              {i < stepLabels.length - 1 && (
                <motion.div
                  className="h-0.5 w-6 rounded-full"
                  animate={{
                    backgroundColor: isDone ? "hsl(155 45% 43%)" : "hsl(220 15% 88%)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-2xl mx-auto px-6 py-20 relative z-10 overflow-y-auto max-h-screen">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
          >
            {step === 1 && <StepWelcome onNext={next} />}
            {step === 2 && (
              <StepCreateMemory
                onComplete={(memory) => {
                  void saveMemory(memory);
                  celebrateThen(
                    "You preserved your first memory.",
                    "📸",
                    next
                  );
                }}
                onPrev={prev}
              />
            )}
            {step === 3 && (
              <StepCreateJournal
                onComplete={(entry) => {
                  void saveJournalEntry(entry);
                  celebrateThen(
                    "You wrote the first page of your story.",
                    "📖",
                    next
                  );
                }}
                onPrev={prev}
              />
            )}
            {step === 4 && (
              <StepCreateDream
                onComplete={(dream) => {
                  void saveDream(dream);
                  celebrateThen(
                    "You planted a seed for your future.",
                    "🌟",
                    next
                  );
                }}
                onPrev={prev}
              />
            )}
            {step === 5 && (
              <StepCreateGoal
                onComplete={(goal) => {
                  void saveGoal(goal);
                  celebrateThen(
                    "Your first goal is set. Let's make it happen.",
                    "🎯",
                    next
                  );
                }}
                onPrev={prev}
              />
            )}
            {step === 6 && <StepComplete onFinish={finish} onPrev={prev} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Welcome Step ─── */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
        className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <BookOpen className="w-10 h-10 text-primary" />
      </motion.div>

      {/* Animated stars */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute text-golden/30"
            style={{ left: `${20 + i * 12}%`, top: `${15 + (i % 3) * 25}%` }}
            animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.5, 1, 0.5], rotate: [0, 180, 360] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
          >
            <Star className="h-3 w-3" />
          </motion.div>
        ))}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-display text-4xl md:text-5xl text-foreground leading-tight"
      >
        Your life is a story<br />
        <span className="text-gradient-hero">waiting to be written.</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-muted-foreground text-lg max-w-md mx-auto"
      >
        In the next few steps, you'll create your first memory, write your first journal page, plant a dream, and set a goal. Let's begin.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onNext}
            size="lg"
            className="gap-2 text-base px-8 gradient-primary text-primary-foreground shadow-glow-primary"
          >
            Begin Your Story <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Complete Step ─── */
function StepComplete({ onPrev, onFinish }: { onPrev: () => void; onFinish: () => void }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Sparkles className="w-12 h-12 text-primary" />
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-4xl text-foreground"
      >
        Your story <span className="text-gradient-hero">begins now.</span>
      </motion.h2>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center gap-4 flex-wrap"
      >
        {[
          { emoji: "📸", label: "First Memory" },
          { emoji: "📖", label: "First Journal Page" },
          { emoji: "🌟", label: "First Dream" },
          { emoji: "🎯", label: "First Goal" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="glass-card p-4 flex flex-col items-center gap-2 min-w-[100px]"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
            <span className="text-[10px] text-primary font-semibold">✓ Created</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-muted-foreground text-lg max-w-md mx-auto font-handwritten text-xl"
      >
        "The beginning is always today."
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onFinish}
            size="lg"
            className="gap-2 text-base px-10 gradient-primary text-primary-foreground shadow-glow-primary"
          >
            Enter LifeOS <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
        <button
          onClick={onPrev}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go back
        </button>
      </motion.div>
    </div>
  );
}
