import { motion } from "framer-motion";

interface FloatingParticlesProps {
  count?: number;
  colors?: string[];
  className?: string;
}

export function FloatingParticles({ count = 20, colors = ["primary", "golden", "calm"], className = "" }: FloatingParticlesProps) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 8,
    color: colors[i % colors.length],
  }));

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `hsl(var(--${p.color}) / 0.4)`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}