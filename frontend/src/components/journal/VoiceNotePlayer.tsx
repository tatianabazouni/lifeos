/**
 * VoiceNotePlayer — Animated waveform bars with play/progress ring.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

const BAR_COUNT = 12;

const VoiceNotePlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    if (!playing) {
      setPlaying(true);
      // Simulate playback
      let p = 0;
      const interval = setInterval(() => {
        p += 2;
        setProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setPlaying(false);
          setProgress(0);
        }
      }, 100);
    } else {
      setPlaying(false);
    }
  };

  const circumference = 2 * Math.PI * 16;
  const strokeDash = (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
      {/* Play button with progress ring */}
      <button onClick={toggle} className="relative w-10 h-10 flex-shrink-0">
        <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="2" opacity="0.3" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - strokeDash}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {playing ? (
            <Pause className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Play className="h-3.5 w-3.5 text-primary ml-0.5" />
          )}
        </div>
      </button>

      {/* Waveform bars */}
      <div className="flex items-center gap-[3px] h-8 flex-1">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const baseHeight = 30 + ((i * 17 + 7) % 70);
          return (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-primary/60"
              animate={playing ? {
                height: [`${baseHeight}%`, `${20 + Math.random() * 80}%`, `${baseHeight}%`],
              } : {
                height: `${baseHeight}%`,
              }}
              transition={playing ? {
                duration: 0.4 + Math.random() * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              } : { duration: 0.3 }}
              style={{ height: `${baseHeight}%` }}
            />
          );
        })}
      </div>

      <span className="text-[10px] text-muted-foreground flex-shrink-0">0:15</span>
    </div>
  );
};

export default VoiceNotePlayer;
