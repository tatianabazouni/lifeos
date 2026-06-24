/**
 * Life Capsule — Memory management with 3D vault, gallery, and timeline views.
 * Data is loaded from the Life API via useMemories hook.
 */
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Heart, Clock, Sparkles, Search, BookOpen,
  Baby, Star, GraduationCap, Briefcase, TreePine, Plane, Users,
  FileText, Image, Mic, Video, Calendar, Box, LayoutGrid, AlignHorizontalDistributeCenter,
} from "lucide-react";
import { AddMemoryModal } from "@/components/life-capsule/AddMemoryModal";
import { MemoryVaultCanvas } from "@/components/life-capsule/MemoryVaultScene";
import { MemoryDetailPanel } from "@/components/life-capsule/MemoryDetailPanel";
import { MemoryTimeline } from "@/components/life-capsule/MemoryTimeline";
import { EmptyVault } from "@/components/life-capsule/EmptyVault";
import { useMemories } from "@/hooks/useMemories";
import type { MemoryItem } from "@/components/life-capsule/MemoryVaultScene";

/* ─── Categories ─── */
const categoryIconByKey: Record<string, typeof BookOpen> = {
  childhood: Baby,
  school: Star,
  achievements: GraduationCap,
  friends: Users,
  travels: Plane,
  goals: Briefcase,
  reflections: TreePine,
};

const typeIcon: Record<string, typeof FileText> = {
  text: FileText, image: Image, voice: Mic, video: Video,
};

const emotionEmoji: Record<string, string> = {
  joy: "☀️", calm: "🌙", love: "❤️", nostalgia: "✨", growth: "🌱",
};

/* ─── Inspiration prompts ─── */
const inspirationPrompts = [
  "Upload a photo from a moment that made you proud.",
  "Add a memory from a difficult time you overcame.",
  "Store a message or letter that means a lot to you.",
  "Upload a photo from a place that changed your life.",
  "Save something that reminds you of someone important.",
];

/* ─── Animations ─── */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ─── Memory Card ─── */
const MemoryCard = ({ memory, index, onClick }: {
  memory: MemoryItem; index: number; onClick: () => void;
}) => {
  const TypeIcon = typeIcon[memory.type] || FileText;
  const rotation = ((index % 5) - 2) * 0.8;

  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -6, rotate: 0, scale: 1.02, zIndex: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ rotate: `${rotation}deg` }}
    >
      <div className="surface-scrapbook p-0 overflow-hidden group">
        <div className="tape-effect" />
        {memory.type === "image" && memory.imageUrl ? (
          <div className="mx-3 mt-5 mb-2">
            <div className="bg-card p-1.5 pb-5 rounded-sm shadow-md">
              <div className="aspect-[4/3] overflow-hidden rounded-sm">
                <img src={memory.imageUrl} alt={memory.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            </div>
          </div>
        ) : memory.type === "video" && memory.mediaUrl ? (
          <div className="mx-3 mt-5 mb-2">
            <div className="bg-card p-1.5 pb-5 rounded-sm shadow-md">
              <div className="aspect-[4/3] overflow-hidden rounded-sm">
                <video src={memory.mediaUrl} className="w-full h-full object-cover" muted playsInline />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 mt-5 mb-2 flex items-center justify-center h-28 bg-muted/20 rounded-xl">
            <TypeIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="px-5 pb-5 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {new Date(memory.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <span className="text-sm">{emotionEmoji[memory.emotion] || "📝"}</span>
          </div>
          <h3 className="font-handwritten text-xl leading-tight text-foreground">{memory.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{memory.description}</p>
          {memory.tags.length > 0 && (
            <div className="flex gap-1.5 pt-1 flex-wrap">
              {memory.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] rounded-full px-2 py-0">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── 3D Scene Wrapper ─── */
const MemoryCapsule3D = ({ memories, activeCategory, onSelectMemory, onAdd }: {
  memories: MemoryItem[]; activeCategory: string | null;
  onSelectMemory: (m: MemoryItem) => void; onAdd: () => void;
}) => {
  const [boxOpen, setBoxOpen] = useState(false);

  if (memories.length === 0) {
    return <EmptyVault onAdd={onAdd} />;
  }

  return (
    <div className="space-y-4">
      <div
        className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg bg-gradient-to-b from-amber-50/60 to-orange-50/40"
        style={{ height: "clamp(400px, 55vh, 600px)" }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
            <span className="ml-2 text-sm">Loading your memory box…</span>
          </div>
        }>
          <MemoryVaultCanvas
            memories={memories}
            onSelectMemory={onSelectMemory}
            isOpen={boxOpen}
            activeChapter={activeCategory}
          />
        </Suspense>

        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 z-20 flex gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => setBoxOpen(!boxOpen)}
            className="glass text-xs text-foreground/80 hover:text-foreground rounded-xl"
          >
            <Box className="h-3 w-3 mr-1.5" />
            {boxOpen ? "Close Box" : "Open Box"}
          </Button>
        </div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-4 right-4 z-20 text-[11px] text-muted-foreground/50 font-handwritten"
        >
          Click a memory to read it · Drag to look around
        </motion.p>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const LifeCapsule = () => {
  const { memories, chapters, addMemory, addChapter, deleteMemory, updateMemory } = useMemories();
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"capsule" | "grid" | "timeline">("capsule");

  const categories = chapters.map((chapter) => ({
    id: chapter.id,
    key: chapter.key,
    label: chapter.label,
    icon: categoryIconByKey[chapter.key] || BookOpen,
  }));

  const filtered = memories.filter((m) => {
    if (activeCategory && String(m.chapter) !== String(activeCategory)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q)
        || m.description.toLowerCase().includes(q)
        || m.tags.some((t) => String(t).toLowerCase().includes(q));
    }
    return true;
  });

  // Random inspiration prompt
  const [promptIdx] = useState(() => Math.floor(Math.random() * inspirationPrompts.length));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Memory Capsule</h1>
          <p className="text-muted-foreground mt-1 font-handwritten text-xl">Preserve the moments that shaped your story</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted/40 rounded-xl p-1 border border-border/30">
            <button onClick={() => setViewMode("capsule")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${viewMode === "capsule" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              <Box className="h-3.5 w-3.5" /> 3D Box
            </button>
            <button onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${viewMode === "grid" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Gallery
            </button>
            <button onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${viewMode === "timeline" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          <Button onClick={() => setAddModalOpen(true)} className="gradient-primary text-primary-foreground shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add Memory
          </Button>
        </div>
      </motion.div>

      {/* Stats + search */}
      {memories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="rounded-full border-border/40 text-muted-foreground text-xs">
            <Heart className="h-3 w-3 mr-1 text-accent" /> {memories.length} {memories.length === 1 ? "memory" : "memories"}
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/40 text-muted-foreground text-xs">
            <Clock className="h-3 w-3 mr-1 text-primary" /> {new Set(memories.map((m) => String(m.chapter))).size} chapters
          </Badge>
          <div className="flex-1 max-w-xs ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search memories…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl bg-muted/30 border-border/30" />
          </div>
        </motion.div>
      )}

      {/* Category chips */}
      {memories.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveCategory(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${activeCategory === null ? "bg-primary text-primary-foreground shadow-md font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
            <BookOpen className="h-3.5 w-3.5" /> All
          </button>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const count = memories.filter((m) => String(m.chapter) === String(cat.id)).length;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(isActive ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${isActive ? "bg-primary text-primary-foreground shadow-md font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                <Icon className="h-3.5 w-3.5" /> {cat.label}
                {count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Inspiration prompt */}
      {memories.length > 0 && memories.length < 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="surface-card p-4 gradient-warm rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-amber mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Memory inspiration</p>
                <p className="text-sm text-muted-foreground">{inspirationPrompts[promptIdx]}</p>
              </div>
              <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-xs" onClick={() => setAddModalOpen(true)}>
                Add
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "capsule" ? (
          <motion.div key="capsule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MemoryCapsule3D
              memories={filtered}
              activeCategory={activeCategory}
              onSelectMemory={setSelectedMemory}
              onAdd={() => setAddModalOpen(true)}
            />
          </motion.div>
        ) : viewMode === "timeline" ? (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MemoryTimeline
              memories={filtered}
              onSelect={setSelectedMemory}
              onAdd={() => setAddModalOpen(true)}
            />
          </motion.div>
        ) : filtered.length > 0 ? (
          <motion.div key="grid" initial="hidden" animate="show" variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((memory, i) => (
              <MemoryCard key={memory.id} memory={memory} index={i} onClick={() => setSelectedMemory(memory)} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EmptyVault onAdd={() => setAddModalOpen(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail panel (slide-in) */}
      <MemoryDetailPanel
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onDelete={deleteMemory}
        onUpdate={async (id, updates) => {
          await updateMemory(id, updates);
          setSelectedMemory((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
        }}
        chapters={categories.map((c) => ({ id: c.id, label: c.label }))}
      />

      {/* Add Memory Modal */}
      <AddMemoryModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={addMemory}
        onCreateChapter={addChapter}
        chapters={categories}
      />
    </div>
  );
};

export default LifeCapsule;
