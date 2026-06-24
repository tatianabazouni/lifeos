import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingParticles } from "@/components/FloatingParticles";
import { Sparkles, ArrowRight, Mail, Lock } from "lucide-react";
import { authApi } from "@/api/authApi";
import { authStore } from "@/lib/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const payload = await authApi.login({ email, password }) as { token: string; user: { id: string; name: string; email: string } };
      authStore.setToken(payload.token);
      authStore.setUser(payload.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.08), hsl(228 67% 41% / 0.05))",
              "linear-gradient(225deg, hsl(220 20% 97%), hsl(228 67% 41% / 0.08), hsl(155 45% 43% / 0.05))",
              "linear-gradient(315deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.06), hsl(338 100% 39% / 0.04))",
              "linear-gradient(135deg, hsl(220 20% 97%), hsl(155 45% 43% / 0.08), hsl(228 67% 41% / 0.05))",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <FloatingParticles count={15} colors={["primary", "calm", "golden"]} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
            <span className="font-display text-2xl font-bold text-foreground">LifeOS</span>
          </Link>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-handwritten text-xl text-muted-foreground"
          >
            Welcome back, storyteller
          </motion.p>
        </motion.div>

        {/* Glass card */}
        <motion.div
          className="glass-card p-8 shadow-cinematic"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <h1 className="font-display text-2xl font-bold text-center text-foreground mb-6">Sign in</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <motion.div
              className="space-y-2"
              animate={focusedField === "email" ? { scale: 1.01 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className={`rounded-xl border-border/50 bg-background/50 transition-all duration-300 ${
                  focusedField === "email" ? "shadow-glow-primary border-primary/50" : ""
                }`}
              />
            </motion.div>

            <motion.div
              className="space-y-2"
              animate={focusedField === "password" ? { scale: 1.01 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className={`rounded-xl border-border/50 bg-background/50 transition-all duration-300 ${
                  focusedField === "password" ? "shadow-glow-primary border-primary/50" : ""
                }`}
              />
            </motion.div>

            {error && <p className="text-sm text-accent">{error}</p>}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={isSubmitting} className="w-full gradient-primary text-primary-foreground rounded-xl py-5 text-base shadow-glow-primary mt-2">
                {isSubmitting ? "Signing in..." : "Continue your story"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
              <div className="relative flex justify-center text-xs"><span className="px-3 bg-card/60 text-muted-foreground">or</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-xl border-border/40 hover:shadow-depth transition-shadow">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </Button>
              <Button variant="outline" className="rounded-xl border-border/40 hover:shadow-depth transition-shadow">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-5">
            New here?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create your story
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
