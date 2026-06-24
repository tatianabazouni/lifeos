import { motion } from "framer-motion";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  hasImage?: boolean;
}

export function SkeletonCard({ className = "", lines = 3, hasImage = false }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-2xl border border-border/30 bg-card/50 overflow-hidden ${className}`}
    >
      {hasImage && <div className="h-32 shimmer" />}
      <div className="p-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="shimmer rounded-md"
            style={{
              height: i === 0 ? 20 : 14,
              width: i === 0 ? "70%" : i === lines - 1 ? "40%" : "90%",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}