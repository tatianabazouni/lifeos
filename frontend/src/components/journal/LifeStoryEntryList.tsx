import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTIONS, type LifeStoryEntry, type LifeStorySection } from "./lifeStoryTypes";
import { format } from "date-fns";

interface Props {
  entries: LifeStoryEntry[];
  filterSection?: LifeStorySection;
  onBack: () => void;
  onEdit: (entry: LifeStoryEntry) => void;
  onDelete: (id: string) => void;
}

function seededRotation(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 5) - 2);
}

export default function LifeStoryEntryList({ entries, filterSection, onBack, onEdit, onDelete }: Props) {
  const filtered = filterSection
    ? entries.filter((e) => e.section === filterSection)
    : entries;

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="font-display text-xl font-bold">
          {filterSection
            ? `${SECTIONS.find((s) => s.key === filterSection)?.icon} ${SECTIONS.find((s) => s.key === filterSection)?.title} Entries`
            : "All Entries"}
        </h2>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-5xl">📝</p>
          <p className="font-display text-lg font-semibold text-muted-foreground">
            No entries yet
          </p>
          <p className="text-sm text-muted-foreground">Start writing to see your story unfold here.</p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-4 space-y-4">
          <AnimatePresence>
            {sorted.map((entry, i) => {
              const sectionMeta = SECTIONS.find((s) => s.key === entry.section);
              const rot = seededRotation(entry.id);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, rotate: rot }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ rotate: 0, y: -4, scale: 1.02 }}
                  transition={{ delay: 0.03 * i }}
                  className="break-inside-avoid surface-scrapbook p-5 cursor-pointer relative group"
                  onClick={() => onEdit(entry)}
                >
                  <div className="tape-effect" />
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sectionMeta && <span className="text-lg">{sectionMeta.icon}</span>}
                        <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full capitalize">
                          {entry.type}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg leading-snug line-clamp-2">
                      {entry.title}
                    </h3>
                    <p className="font-handwritten text-base text-muted-foreground line-clamp-4 leading-relaxed">
                      {entry.content}
                    </p>
                    {entry.heartContent && (
                      <p className="font-handwritten text-base text-accent/70 line-clamp-2 leading-relaxed italic">
                        ❤️ {entry.heartContent}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {entry.wordCount} words · Level {entry.depthLevel}
                      </span>
                      {entry.mood && (
                        <span className="text-xs bg-muted/30 px-2 py-0.5 rounded-full">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
