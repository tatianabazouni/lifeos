/**
 * MemoryTimeline — Horizontal scrollable timeline view
 * with year markers and animated nodes.
 */
import { useRef, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Mic, Plus, Sparkles, Video } from "lucide-react";
import type { MemoryItem } from "./MemoryVaultScene";

const emotionGradients: Record<string, string> = {
  joy: "from-highlight/20 to-highlight/5",
  calm: "from-calm/20 to-calm/5",
  love: "from-accent/20 to-accent/5",
  nostalgia: "from-primary/20 to-primary/5",
  growth: "from-growth/20 to-growth/5",
};

const emotionEmoji: Record<string, string> = {
  joy: "☀️", calm: "🌙", love: "❤️", nostalgia: "✨", growth: "🌱",
};

interface Props {
  memories: MemoryItem[];
  onSelect: (memory: MemoryItem) => void;
  onAdd: () => void;
}

function TimelineNode({ memory, index, onSelect }: { memory: MemoryItem; index: number; onSelect: () => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const gradient = emotionGradients[memory.emotion] || "from-muted/20 to-muted/5";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className="flex-shrink-0 w-[240px] cursor-pointer group"
    >
      {/* Connector dot */}
      <div className="flex items-center justify-center mb-3">
        <motion.div
          whileHover={{ scale: 1.8 }}
          className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)] transition-transform duration-300"
        />
      </div>

      {/* Card */}
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`bg-gradient-to-b ${gradient} rounded-2xl p-4 border border-border/30 shadow-md
          hover:shadow-xl transition-shadow duration-300`}
      >
        {memory.type === "image" && memory.imageUrl && (
          <div className="aspect-video rounded-xl overflow-hidden mb-3">
            <img src={memory.imageUrl} alt={memory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        {memory.type === "video" && memory.mediaUrl && (
          <div className="aspect-video rounded-xl overflow-hidden mb-3">
            <video src={memory.mediaUrl} className="w-full h-full object-cover" muted playsInline />
          </div>
        )}
        {memory.type === "voice" && (
          <div className="aspect-video rounded-xl overflow-hidden mb-3 bg-muted/30 flex items-center justify-center">
            <Mic className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">
          {new Date(memory.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </p>
        <h4 className="font-display text-sm font-semibold text-foreground truncate">{memory.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{memory.description}</p>
        <div className="flex items-center justify-between mt-3">
          <Badge className="text-[10px] rounded-full bg-primary/10 text-primary border-0">
            <Heart className="h-2.5 w-2.5 mr-1" /> {memory.emotion}
          </Badge>
          <span className="text-sm flex items-center gap-1">
            {memory.type === "video" && <Video className="h-3.5 w-3.5" />}
            {memory.type === "voice" && <Mic className="h-3.5 w-3.5" />}
            {emotionEmoji[memory.emotion] || "📝"}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Year group header in the timeline */
function YearMarker({ year }: { year: string }) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center justify-center w-[80px]">
      <div className="w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>
      <span className="font-display text-sm font-bold text-foreground">{year}</span>
    </div>
  );
}

export function MemoryTimeline({ memories, onSelect, onAdd }: Props) {
  const sorted = useMemo(
    () => [...memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [memories]
  );

  if (sorted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 space-y-5"
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
        </motion.div>
        <div>
          <p className="font-display text-xl font-bold text-foreground">Your first memory awaits</p>
          <p className="text-muted-foreground mt-1">Start your story today.</p>
        </div>
        <Button onClick={onAdd} className="gradient-primary text-primary-foreground shadow-md rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Add Your First Memory
        </Button>
      </motion.div>
    );
  }

  // Group by year for markers
  const itemsWithYears: Array<{ type: "year"; year: string } | { type: "memory"; memory: MemoryItem; index: number }> = [];
  let lastYear = "";
  sorted.forEach((memory, i) => {
    const year = new Date(memory.date).getFullYear().toString();
    if (year !== lastYear) {
      itemsWithYears.push({ type: "year", year });
      lastYear = year;
    }
    itemsWithYears.push({ type: "memory", memory, index: i });
  });

  return (
    <div className="relative">
      {/* Horizontal line */}
      <div className="absolute top-[6px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-2 scrollbar-hide">
        {itemsWithYears.map((item, i) =>
          item.type === "year" ? (
            <YearMarker key={`year-${item.year}`} year={item.year} />
          ) : (
            <TimelineNode
              key={item.memory.id}
              memory={item.memory}
              index={item.index}
              onSelect={() => onSelect(item.memory)}
            />
          )
        )}
      </div>
    </div>
  );
}
