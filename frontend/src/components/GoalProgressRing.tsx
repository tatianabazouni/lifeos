import { motion } from "framer-motion";

interface GoalProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function GoalProgressRing({ progress, size = 80, strokeWidth = 6, className = "", children }: GoalProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || <span className="text-sm font-bold">{progress}%</span>}
      </div>
    </div>
  );
}
