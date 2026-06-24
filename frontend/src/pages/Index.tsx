import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FloatingParticles } from "@/components/FloatingParticles";
import { Sparkles, BookOpen, Target, Brain, Camera, Heart, Star, ArrowRight, ChevronDown, Palette } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: BookOpen, title: "Journal", desc: "Digital scrapbook diary with moods, photos & reflections", color: "text-calm" },
  { icon: Palette, title: "Vision Board", desc: "Pinterest-style boards for your wildest dreams", color: "text-golden" },
  { icon: Target, title: "Goals", desc: "Turn dreams into trackable achievements", color: "text-primary" },
  { icon: Camera, title: "Life Capsule", desc: "Time-locked memories from every chapter", color: "text-accent" },
  { icon: Brain, title: "Vie.ai", desc: "Your personal AI life companion", color: "text-calm" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-strong">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">LifeOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className="gradient-primary text-primary-foreground">Start Free</Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 gradient-hero" />
        <FloatingParticles count={20} colors={["primary", "golden", "calm"]} />

        {/* Soft orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { color: "primary", x: 15, y: 20, size: 200 },
            { color: "golden", x: 70, y: 30, size: 150 },
            { color: "calm", x: 40, y: 70, size: 120 },
          ].map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: orb.size, height: orb.size,
                left: `${orb.x}%`, top: `${orb.y}%`,
                background: `hsl(var(--${orb.color}) / 0.08)`,
              }}
              animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
              transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 text-center relative z-10 max-w-4xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-muted-foreground font-handwritten text-3xl mb-4"
          >
            Your story matters
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6 text-foreground"
          >
            Your life is more than memories.{" "}
            <span className="text-gradient-hero">It's a story worth remembering.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Document your journey, set meaningful goals, and build the life you've always imagined.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Link to="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="gradient-primary text-primary-foreground text-lg px-8 py-6 shadow-glow-primary">
                  <Heart className="mr-2 h-5 w-5" />
                  Start Your Life Journey
                </Button>
              </motion.div>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-16">
            <ChevronDown className="mx-auto h-6 w-6 text-muted-foreground animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="font-handwritten text-2xl text-muted-foreground mb-2">Three pillars of a meaningful life</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
              Remember. Reflect. <span className="text-gradient-hero">Build.</span>
            </h2>
          </motion.div>

          {[
            { label: "Remember", title: "Your past is a treasure", desc: "Capture childhood photos, milestone moments, and life chapters in a beautiful timeline.", gradient: "from-golden/10 to-amber/5", icon: "📸" },
            { label: "Reflect", title: "Your present has meaning", desc: "Journal your thoughts, track your moods, and discover patterns in your daily life.", gradient: "from-primary/10 to-calm/5", icon: "📝" },
            { label: "Build", title: "Your future is yours to design", desc: "Pin your dreams, set meaningful goals, and earn XP as you grow.", gradient: "from-calm/10 to-primary/5", icon: "🚀" },
          ].map((pillar, i) => (
            <motion.div
              key={pillar.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -4, scale: 1.01 }}
              className={`bg-gradient-to-br ${pillar.gradient} rounded-2xl p-10 md:p-14 mb-6 border border-border/30 glass-card`}
            >
              <span className="text-4xl mb-3 block">{pillar.icon}</span>
              <span className="font-handwritten text-2xl text-muted-foreground">{pillar.label}</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-2 mb-4 text-foreground">{pillar.title}</h2>
              <p className="text-muted-foreground text-lg max-w-xl">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative">
        <div className="absolute inset-0 gradient-hero" />
        <FloatingParticles count={10} colors={["primary", "golden"]} />
        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          <motion.h2 variants={fadeUp} custom={0} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Everything you need to live <span className="text-gradient-hero">intentionally</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-muted-foreground mb-16 max-w-lg mx-auto">
            Each feature is crafted to help you document, dream, and grow.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="glass-card p-6 group cursor-pointer"
              >
                <f.icon className={`h-8 w-8 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4 text-center max-w-3xl"
        >
          <p className="font-handwritten text-3xl text-muted-foreground mb-4">Your life is a story worth telling</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-8 text-foreground">
            Begin documenting your journey <span className="text-gradient-hero">today</span>
          </h2>
          <Link to="/register">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="gradient-primary text-primary-foreground text-lg px-8 py-6 shadow-glow-primary">
                Start Your Life Journey <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">LifeOS</span>
          </div>
          <p>Your life. Your story. Your OS.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;