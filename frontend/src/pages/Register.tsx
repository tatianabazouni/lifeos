import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingParticles } from "@/components/FloatingParticles";
import { Sparkles, ArrowRight, ArrowLeft, User, Mail, Lock, Eye } from "lucide-react";
import { authApi } from "@/api/authApi";
import { authStore } from "@/lib/auth";

const steps = [
  { id: 1, title: "Create your account", subtitle: "Begin your life journey" },
  { id: 2, title: "What's your vision?", subtitle: "Dream big, start small" },
];

const visionOptions = [
  { id: "growth", label: "Personal Growth", emoji: "🌱" },
  { id: "career", label: "Career Success", emoji: "🚀" },
  { id: "health", label: "Health & Wellness", emoji: "💪" },
  { id: "travel", label: "Travel & Adventure", emoji: "🌍" },
  { id: "creativity", label: "Creative Expression", emoji: "🎨" },
  { id: "relationships", label: "Deep Relationships", emoji: "💕" },
];

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
};

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedVisions, setSelectedVisions] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const next = () => { setDirection(1); setStep((s) => Math.min(s + 1, 2)); };
  const prev = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); };

  const toggleVision = (id: string) => {
    setSelectedVisions((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleFinish = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const payload = await authApi.register({ name, email, password }) as { token: string; user: { id: string; name: string; email: string } };
      authStore.setToken(payload.token);
      authStore.setUser(payload.user);
      setShowConfetti(true);
      setTimeout(() => navigate("/onboarding"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.06), hsl(44 100% 66% / 0.04))",
            "linear-gradient(225deg, hsl(220 20% 97%), hsl(338 100% 39% / 0.05), hsl(155 45% 43% / 0.06))",
            "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.06), hsl(44 100% 66% / 0.04))",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <FloatingParticles count={12} colors={["primary", "golden", "accent"]} />

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <>
            {Array.from({ length: 30 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: "50%",
                  top: "40%",
                  background: `hsl(${Math.random() * 360} 80% 60%)`,
                }}
                initial={{ scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 720,
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {steps.map((s) => (
          <motion.div
            key={s.id}
            className="h-1.5 rounded-full transition-all duration-500"
            animate={{
              width: s.id === step ? 40 : s.id < step ? 20 : 12,
              backgroundColor: s.id <= step ? "hsl(155 45% 43%)" : "hsl(220 15% 85%)",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">LifeOS</span>
          </Link>
        </motion.div>

        <motion.div className="glass-card p-8 shadow-cinematic">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 250, damping: 28 }}
            >
              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-bold text-foreground">{steps[0].title}</h1>
                    <p className="font-handwritten text-lg text-muted-foreground">{steps[0].subtitle}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> Your name</Label>
                    <Input placeholder="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-background/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email</Label>
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl bg-background/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl bg-background/50 border-border/50" />
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={next} className="w-full gradient-primary text-primary-foreground rounded-xl py-5 mt-2 shadow-glow-primary" disabled={!name.trim() || !email.trim() || password.trim().length < 8}>
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center mb-4">
                    <h1 className="font-display text-2xl font-bold text-foreground">{steps[1].title}</h1>
                    <p className="font-handwritten text-lg text-muted-foreground">Pick up to 3 life visions</p>
                  </div>
                  {error && <p className="text-sm text-accent text-center">{error}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    {visionOptions.map((v) => {
                      const active = selectedVisions.includes(v.id);
                      return (
                        <motion.button
                          key={v.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleVision(v.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            active
                              ? "border-primary bg-primary/10 shadow-glow-primary"
                              : "border-border/40 bg-background/30 hover:border-border"
                          }`}
                        >
                          <span className="text-2xl block mb-1">{v.emoji}</span>
                          <span className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{v.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">{selectedVisions.length}/3 selected</p>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={prev} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button
                      onClick={handleFinish}
                      className="flex-1 gradient-primary text-primary-foreground"
                      disabled={selectedVisions.length === 0 || isSubmitting}
                    >
                      Start My Journey <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step === 1 && (
            <p className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;
