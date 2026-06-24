/**
 * JournalCalendarHeatmap — GitHub-style contribution heatmap for journal entries.
 * Warm amber/golden fill scaled by entry length. Mood trail below.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
}

const moodEmoji: Record<string, string> = {
  happy: "😊", grateful: "❤️", reflective: "🧠",
  motivated: "☀️", calm: "🌙", sad: "☁️",
};

interface JournalCalendarHeatmapProps {
  entries: JournalEntry[];
  onDayClick?: (date: Date, entry?: JournalEntry) => void;
}

const JournalCalendarHeatmap = ({ entries, onDayClick }: JournalCalendarHeatmapProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Map entries by day string
  const entryMap = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const maxContentLength = useMemo(() => {
    let max = 100;
    entries.forEach((e) => { if (e.content.length > max) max = e.content.length; });
    return max;
  }, [entries]);

  const navigate = (dir: number) => {
    setCurrentMonth(new Date(year, month + dir, 1));
  };

  // Last 7 days mood trail
  const moodTrail = useMemo(() => {
    const trail: { date: Date; mood: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dayEntries = entryMap[key];
      if (dayEntries && dayEntries.length > 0) {
        trail.push({ date: d, mood: dayEntries[0].mood });
      } else {
        trail.push({ date: d, mood: "" });
      }
    }
    return trail;
  }, [entryMap]);

  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <AnimatePresence mode="wait">
            <motion.h3
              key={monthName}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="font-display font-semibold text-base"
            >
              {monthName}
            </motion.h3>
          </AnimatePresence>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground/60 font-medium text-center py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${year}-${month}-${day}`;
            const dayEntries = entryMap[key];
            const hasEntry = dayEntries && dayEntries.length > 0;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            // Intensity: 0-4 based on content length
            let intensity = 0;
            if (hasEntry) {
              const totalLength = dayEntries.reduce((sum, e) => sum + e.content.length, 0);
              intensity = Math.min(4, Math.ceil((totalLength / maxContentLength) * 4));
              if (intensity === 0) intensity = 1;
            }

const intensityColors = [
              "bg-muted/30",                                    // 0 - no entry
              "bg-amber/20",                                    // 1
              "bg-amber/40",                                    // 2
              "bg-golden/50",                                   // 3
              "bg-golden/70",                                   // 4
            ];

            const isHovered = hoveredDay === day;

            return (
              <div key={day} className="relative">
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    if (onDayClick) {
                      const clickedDate = new Date(year, month, day);
                      onDayClick(clickedDate, hasEntry ? dayEntries![0] : undefined);
                    }
                  }}
                  className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors relative cursor-pointer ${
                    isToday
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : ""
                  } ${intensityColors[intensity]}`}
                >
                  <span className={hasEntry ? "text-foreground font-semibold" : "text-muted-foreground/60"}>
                    {day}
                  </span>
                </motion.button>

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && hasEntry && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[140px] bg-background border border-border/50 rounded-xl p-2.5 shadow-lifted pointer-events-none"
                    >
                      <p className="font-display text-xs font-semibold text-foreground truncate">
                        {dayEntries![0].title}
                      </p>
                      <span className="text-lg">{moodEmoji[dayEntries![0].mood] || "📝"}</span>
                      {dayEntries!.length > 1 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          +{dayEntries!.length - 1} more
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {[0, 1, 2, 3, 4].map((level) => {
            const colors = ["bg-muted/30", "bg-amber/20", "bg-amber/40", "bg-golden/50", "bg-golden/70"];
            return <div key={level} className={`w-3 h-3 rounded-sm ${colors[level]}`} />;
          })}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>

      {/* Mood trail */}
      <div className="surface-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Last 7 days mood</p>
        <div className="flex justify-between">
          {moodTrail.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
              className="flex flex-col items-center gap-1"
            >
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ delay: i * 0.15, duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  item.mood ? "bg-golden/15 border border-golden/30" : "bg-muted/20 border border-border/30"
                }`}
              >
                <span className="text-lg">
                  {item.mood ? moodEmoji[item.mood] || "📝" : "·"}
                </span>
              </motion.div>
              <span className="text-[9px] text-muted-foreground/60">
                {item.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JournalCalendarHeatmap;
