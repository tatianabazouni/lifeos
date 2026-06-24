/**
 * JournalListView — Simple, compact list for quick browsing.
 */
import { motion } from "framer-motion";
import { BookOpen, PenLine, Sparkles, Volume2 } from "lucide-react";
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

interface JournalListViewProps {
  entries: JournalEntry[];
  onOpenEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
}

const JournalListView = ({ entries, onOpenEntry, onNewEntry }: JournalListViewProps) => {
  if (entries.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="surface-scrapbook p-10 text-center">
        <div className="tape-effect" />
        <BookOpen className="h-12 w-12 mx-auto text-primary/25 mt-4 mb-4" strokeWidth={1} />
        <h3 className="font-display text-xl font-bold">No entries yet</h3>
        <p className="text-muted-foreground mt-2 mb-4">Start writing your story today.</p>
        <Button onClick={onNewEntry} className="gradient-primary text-primary-foreground shadow-depth rounded-xl">
          <PenLine className="mr-2 h-4 w-4" /> Write your first entry
        </Button>
      </motion.div>
    );
  }

  // Group entries by date
  const grouped: Record<string, JournalEntry[]> = {};
  entries.forEach((e) => {
    const key = new Date(e.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateLabel, dayEntries], gi) => (
        <motion.div
          key={dateLabel}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05 }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2 px-1">
            {dateLabel}
          </p>
          <div className="space-y-2">
            {dayEntries.map((entry) => (
              <motion.button
                key={entry.id}
                whileHover={{ x: 4 }}
                onClick={() => onOpenEntry(entry)}
                className="w-full text-left surface-card p-4 flex items-start gap-3 group"
              >
                <span className="text-xl mt-0.5 flex-shrink-0">
                  {moodEmoji[entry.mood] || "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-semibold text-foreground truncate">
                    {entry.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {entry.content}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {entry.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[9px] rounded-full px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.photos.length > 0 && (
                    <div className="w-8 h-8 rounded-md overflow-hidden">
                      <img src={entry.photos[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {entry.stickers.length > 0 && (
                    <span className="text-sm">{entry.stickers[0]}</span>
                  )}
                  {entry.hasVoiceNote && <Volume2 className="h-3.5 w-3.5 text-primary" />}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default JournalListView;
