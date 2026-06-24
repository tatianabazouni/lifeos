/**
 * ScrapbookView — Pinterest-style masonry journal with handwritten warmth.
 * Each card has tape, mood watermark, date stamp, stickers, polaroid photos.
 */
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, BookOpen, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  photos: string[];
  hasVoiceNote: boolean;
  stickers: string[];
}

const moodEmoji: Record<string, string> = {
  happy: "😊", grateful: "❤️", reflective: "🧠",
  motivated: "☀️", calm: "🌙", sad: "☁️",
};

/** Seeded rotation from entry id for consistency */
function seededRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 7) - 3); // -3 to +3 degrees
}

interface ScrapbookViewProps {
  entries: JournalEntry[];
  onOpenEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

const ScrapbookView = ({ entries, onOpenEntry, onNewEntry }: ScrapbookViewProps) => {
  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="surface-scrapbook p-10 text-center relative overflow-hidden">
          <div className="tape-effect" />
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-8 right-8 opacity-20"
          >
            <Sparkles className="h-8 w-8 text-golden" />
          </motion.div>
          <div className="relative z-10 space-y-5">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <BookOpen className="h-16 w-16 mx-auto text-primary/30" strokeWidth={1} />
            </motion.div>
            <h3 className="font-display text-2xl font-bold">Your story begins here</h3>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Every great story starts with a single page. Begin documenting the moments that make your life uniquely yours.
            </p>
            <p className="font-handwritten text-xl text-muted-foreground/60 italic">"The unexamined life is not worth living." — Socrates</p>
            <Button onClick={onNewEntry} className="gradient-primary text-primary-foreground shadow-depth rounded-xl mt-2">
              <PenLine className="mr-2 h-4 w-4" /> Write your first entry
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

return (
    <div
      className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] px-1"
      style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(35 30% 90% / 0.15) 3px, hsl(35 30% 90% / 0.15) 4px)",
      }}
    >
      <AnimatePresence>
        {entries.map((entry, i) => {
          const rotation = seededRotation(entry.id);
          const emoji = moodEmoji[entry.mood] || "📝";
          const dateObj = new Date(entry.date);

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 40, rotate: rotation }}
              animate={{ opacity: 1, y: 0, rotate: rotation }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{
                y: -8,
                rotate: 0,
                scale: 1.02,
                zIndex: 10,
                boxShadow: "0 16px 40px hsl(30 40% 30% / 0.15), 0 6px 12px hsl(0 0% 0% / 0.08)",
              }}
              onClick={() => onOpenEntry(entry)}
              className="cursor-pointer break-inside-avoid mb-5"
            >
              <div className="surface-scrapbook p-0 overflow-hidden group relative">
                {/* Tape */}
                <div className="tape-effect" />

                {/* Mood watermark */}
                <span
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl pointer-events-none select-none"
                  style={{ opacity: 0.08, transform: "translate(-50%, -50%) rotate(15deg)", fontSize: "120px" }}
                >
                  {emoji}
                </span>

{/* Date stamp */}
                <div className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full border-2 border-primary/20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                  <span className="text-[9px] font-bold text-primary leading-none">
                    {dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                  </span>
                  <span className="text-sm font-display font-bold leading-none text-foreground">
                    {dateObj.getDate()}
                  </span>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-2 space-y-2 relative z-[1]">
                  <h3 className="font-display text-lg font-bold leading-tight text-foreground">
                    {entry.title}
                  </h3>
                  <p className="font-handwritten text-lg text-muted-foreground line-clamp-4 leading-relaxed">
                    {entry.content}
                  </p>

                  {/* Stickers scattered */}
                  {entry.stickers.length > 0 && (
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {entry.stickers.map((s, j) => (
                        <motion.span
                          key={j}
                          className="text-xl"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + j * 0.1, type: "spring", stiffness: 400, damping: 15 }}
                          style={{ transform: `rotate(${(j % 5) * 12 - 24}deg)` }}
                        >
                          {s}
                        </motion.span>
                      ))}
                    </div>
                  )}

                  {entry.hasVoiceNote && (
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <Volume2 className="h-3 w-3" /> Voice note
                    </div>
                  )}

                  {entry.tags.length > 0 && (
                    <div className="flex gap-1.5 pt-1 flex-wrap">
                      {entry.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] rounded-full px-2 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photo (polaroid style) - at the end of the card */}
                {entry.photos.length > 0 && (
                  <div className="mx-4 mb-4">
                    <div className="bg-card p-1.5 pb-6 rounded-sm shadow-depth" style={{ transform: `rotate(${(i % 3) * 1.5 - 1.5}deg)` }}>
                      <div className="aspect-[4/3] overflow-hidden rounded-sm">
                        <img
                          src={entry.photos[0]}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      {entry.photos.length > 1 && (
                        <p className="text-[10px] text-muted-foreground text-center mt-1 font-handwritten">
                          +{entry.photos.length - 1} more photos
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ScrapbookView;
