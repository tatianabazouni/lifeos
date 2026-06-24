import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ value, duration = 1.5, className = "", suffix = "", prefix = "" }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplayValue(Math.round(v)),
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
}