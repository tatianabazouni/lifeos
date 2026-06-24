import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  onClick?: () => void;
  hover?: boolean;
}

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const scaleCard = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export function AnimatedCard({ children, className, index = 0, onClick, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={hover ? { y: -4, scale: 1.015, transition: { duration: 0.25, ease: "easeOut" } } : undefined}
      onClick={onClick}
      className={cn(
        "surface-card cursor-pointer transition-shadow duration-300 hover:shadow-lifted",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function ScrapbookCard({
  children,
  className,
  index = 0,
  onClick,
  tape = false,
}: AnimatedCardProps & { tape?: boolean }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{
        y: -6,
        rotate: 0,
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      onClick={onClick}
      className={cn(
        "surface-scrapbook overflow-hidden cursor-pointer group transition-shadow duration-300 hover:shadow-lifted",
        className
      )}
      style={{ rotate: index % 2 === 0 ? 1 : -1 }}
    >
      {tape && <div className="tape-effect" />}
      {children}
    </motion.div>
  );
}
