/**
 * Journal — Life Story System
 * A structured psychological experience for building your life story.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Feather,
  LayoutGrid,
  List,
  Plus,
  Sparkles,
  Trash2,
  Edit,
  Pencil,
} from "lucide-react";
import ScrapbookView from "@/components/journal/ScrapbookView";
import JournalListView from "@/components/journal/JournalListView";
import JournalEntryEditor from "@/components/journal/JournalEntryEditor";
import JournalCalendarHeatmap from "@/components/journal/JournalCalendarHeatmap";
import VoiceNotePlayer from "@/components/journal/VoiceNotePlayer";
import LifeStoryHome from "@/components/journal/LifeStoryHome";
import LifeStorySectionView from "@/components/journal/LifeStorySectionView";
import LifeStoryWriter from "@/components/journal/LifeStoryWriter";
import LifeStoryEntryList from "@/components/journal/LifeStoryEntryList";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { journalApi } from "@/api/journalApi";
import {
  SECTIONS,
  SECTION_PROMPTS,
  type LifeStoryEntry,
  type LifeStorySection,
  type LifeStoryPrompt,
  type EntryType,
} from "@/components/journal/lifeStoryTypes";
import AIJournalInsight from "@/components/ai/AIJournalInsight";

// import { JournalEntry } from "./types"; // remove duplicate

/* ── Legacy journal entry (kept for scrapbook/list views) ── */
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

type View =
  | "lifestory"
  | "section"
  | "writer"
  | "entries"
  | "scrapbook"
  | "list";

const Journal = () => {
  /* ── Legacy entries ── */
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<JournalEntry | null>(null);
  const [editingLegacyEntry, setEditingLegacyEntry] = useState<JournalEntry | null>(null);
  const [initialDate, setInitialDate] = useState<string>("");

  /* ── Life Story state ── */
  const [lifeEntries, setLifeEntries] = useState<LifeStoryEntry[]>([]);
  const [view, setView] = useState<View>("scrapbook");
  const [activeSection, setActiveSection] = useState<LifeStorySection | null>(null);
  const [activePrompt, setActivePrompt] = useState<LifeStoryPrompt | null>(null);
  const [activeEntryType, setActiveEntryType] = useState<EntryType>("lifebook");
  const [editingEntry, setEditingEntry] = useState<LifeStoryEntry | null>(null);
  const [showAIInsight, setShowAIInsight] = useState(false);
  const [latestEntry, setLatestEntry] = useState<JournalEntry | LifeStoryEntry | null>(null);

  useEffect(() => {
    if (!showAIInsight) return;
    const t = setTimeout(() => setShowAIInsight(false), 8000);
    return () => clearTimeout(t);
  }, [showAIInsight]);

  useEffect(() => {
    const loadEntries = async () => {
      const [journalData, lifeData] = await Promise.all([
        journalApi.getAll() as Promise<any[]>,
        journalApi.getAllLifeStoryEntries() as Promise<any[]>,
      ]);
      const journalEntries = Array.isArray(journalData) ? journalData : [];
      setEntries(journalEntries.map((entry) => ({
        id: String(entry._id || entry.id),
        date: String(entry.date || entry.createdAt || new Date().toISOString()).slice(0, 10),
        title: entry.title || "Untitled",
        content: entry.content || "",
        mood: entry.mood || "neutral",
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        photos: Array.isArray(entry.photos) ? entry.photos : [],
        hasVoiceNote: Boolean(entry.hasVoiceNote),
        stickers: Array.isArray(entry.stickers) ? entry.stickers : [],
      })));

      const lifeEntriesData = Array.isArray(lifeData) ? lifeData : [];
      setLifeEntries(
        lifeEntriesData.map((entry) => ({
          id: String(entry._id || entry.id),
          type: entry.type || "lifebook",
          section: entry.section || undefined,
          promptId: entry.promptId || undefined,
          title: entry.title || "Untitled",
          content: entry.content || "",
          heartContent: entry.heartContent || "",
          mood: entry.mood || "neutral",
          depthLevel: Number(entry.depthLevel || 1),
          createdAt: String(entry.createdAt || new Date().toISOString()),
          wordCount: Number(entry.wordCount || 0),
        }))
      );
    };
    void loadEntries();
  }, []);

  const handleSaveEntry = useCallback(async (entry: JournalEntry) => {
    let result: any;
    const existing = entries.find((e) => e.id === entry.id);
    if (existing) {
      result = await journalApi.update(entry.id, {
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags,
        date: entry.date,
      });
    } else {
      result = await journalApi.create({
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags,
        date: entry.date,
      });
    }

    const savedEntry: JournalEntry = {
      ...entry,
      id: String(result._id || result.id),
      date: String(result.date || result.createdAt || entry.date).slice(0, 10),
    };

    setEntries((prev) => [savedEntry, ...prev.filter((e) => e.id !== entry.id)]);
    setLatestEntry(savedEntry);
    setShowAIInsight(true);
  }, [entries]);

  const handleSaveLifeEntry = useCallback(async (entry: LifeStoryEntry) => {
    const existing = lifeEntries.find((e) => e.id === entry.id);
    if (existing) {
      const updated = await journalApi.updateLifeStoryEntry(entry.id, entry) as any;
      const normalized = {
        ...entry,
        id: String(updated._id || updated.id || entry.id),
        createdAt: String(updated.createdAt || entry.createdAt),
      };
      setLifeEntries((prev) => prev.map((e) => (e.id === entry.id ? normalized : e)));
      setLatestEntry(normalized);
      setShowAIInsight(true);
      return;
    }

    const created = await journalApi.createLifeStoryEntry(entry) as any;
    const normalized = {
      ...entry,
      id: String(created._id || created.id),
      createdAt: String(created.createdAt || entry.createdAt),
    };

    setLifeEntries((prev) => [normalized, ...prev.filter((e) => e.id !== entry.id)]);
    setLatestEntry(normalized);
    setShowAIInsight(true);
  }, [lifeEntries]);

  const handleDeleteLifeEntry = useCallback(async (id: string) => {
    await journalApi.deleteLifeStoryEntry(id);
    setLifeEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleDeleteEntry = useCallback(async (id: string) => {
    await journalApi.remove(id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setExpandedEntry((current) => (current?.id === id ? null : current));
  }, []);

// Handle day click from calendar - create new entry or edit existing
  const handleDayClick = useCallback((date: Date, entry?: JournalEntry) => {
    const dateStr = date.toISOString().slice(0, 10);
    if (entry) {
      // Edit existing entry
      setEditingLegacyEntry(entry);
      setInitialDate(entry.date);
      setShowEditor(true);
    } else {
      // Create new entry with this date
      setEditingLegacyEntry(null);
      setInitialDate(dateStr);
      setShowEditor(true);
    }
  }, []);

  // Handle edit from expanded view
  const handleEditFromExpanded = useCallback((entry: JournalEntry) => {
    setEditingLegacyEntry(entry);
    setInitialDate(entry.date);
    setExpandedEntry(null);
    setShowEditor(true);
  }, []);

  /* ── Navigation helpers ── */
  const openSection = (section: LifeStorySection) => {
    setActiveSection(section);
    setView("section");
  };

  const startEntry = (type: EntryType, section?: LifeStorySection) => {
    setActiveEntryType(type);
    setActiveSection(section || null);
    setActivePrompt(null);
    setEditingEntry(null);
    setView("writer");
  };

  const startPrompt = (prompt: LifeStoryPrompt) => {
    setActivePrompt(prompt);
    setActiveEntryType("lifebook");
    const existing = lifeEntries.find((e) => e.promptId === prompt.id);
    setEditingEntry(existing || null);
    setView("writer");
  };

  const editEntry = (entry: LifeStoryEntry) => {
    setEditingEntry(entry);
    setActiveEntryType(entry.type);
    setActiveSection(entry.section || null);
    if (entry.promptId && entry.section) {
      const prompt = SECTION_PROMPTS[entry.section]?.find((p) => p.id === entry.promptId);
      setActivePrompt(prompt || null);
    } else {
      setActivePrompt(null);
    }
    setView("writer");
  };

  const viewModes = [
    { key: "scrapbook" as const, icon: LayoutGrid, label: "Scrapbook" },
    { key: "list" as const, icon: List, label: "List" },
    { key: "lifestory" as const, icon: Feather, label: "Life Story" },
  ];

  const isLegacyView = view === "scrapbook" || view === "list";
  const isLifeStoryDeep = view === "section" || view === "writer" || view === "entries";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header — hide when in writer */}
      {view !== "writer" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3"
        >
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {view === "lifestory" || isLifeStoryDeep ? "Life Story" : "Journal"}
            </h1>
            <p className="text-muted-foreground mt-1 font-handwritten text-xl">
              {view === "lifestory" || isLifeStoryDeep
                ? "Write your life consciously"
                : "Your digital scrapbook of life"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View switcher — only on top-level views */}
            {!isLifeStoryDeep && (
              <div className="flex items-center bg-muted/40 rounded-xl p-1 border border-border/30">
                {viewModes.map((vm) => {
                  const Icon = vm.icon;
                  return (
                    <button
                      key={vm.key}
                      onClick={() => setView(vm.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        view === vm.key
                          ? "bg-background shadow-sm font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{vm.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {isLegacyView && (
              <Button
                onClick={() => setShowEditor(true)}
                className="gradient-primary text-primary-foreground shadow-depth rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" /> New Entry
              </Button>
            )}
            {view === "lifestory" && (
              <Button
                onClick={() => setView("entries")}
                variant="outline"
                className="rounded-xl"
              >
                All Entries
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view === "lifestory" && (
          <motion.div key="lifestory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LifeStoryHome
              entries={lifeEntries}
              onOpenSection={openSection}
              onStartEntry={startEntry}
            />
          </motion.div>
        )}

        {view === "section" && activeSection && (
          <motion.div key="section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LifeStorySectionView
              section={activeSection}
              entries={lifeEntries}
              onBack={() => setView("lifestory")}
              onStartPrompt={startPrompt}
            />
          </motion.div>
        )}

        {view === "writer" && (
          <motion.div key="writer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LifeStoryWriter
              entryType={activeEntryType}
              prompt={activePrompt || undefined}
              section={activeSection || undefined}
              existingEntry={editingEntry || undefined}
              onSave={handleSaveLifeEntry}
              onBack={() => {
                if (activeSection && !editingEntry) setView("section");
                else setView("lifestory");
              }}
            />
          </motion.div>
        )}

        {view === "entries" && (
          <motion.div key="entries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LifeStoryEntryList
              entries={lifeEntries}
              onBack={() => setView("lifestory")}
              onEdit={editEntry}
              onDelete={handleDeleteLifeEntry}
            />
          </motion.div>
        )}

        {(view === "scrapbook" || view === "list") && (
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6"
          >
            <div>
              {view === "scrapbook" ? (
                <ScrapbookView
                  entries={entries}
                  onOpenEntry={setExpandedEntry}
                  onNewEntry={() => setShowEditor(true)}
                />
              ) : (
                <JournalListView
                  entries={entries}
                  onOpenEntry={setExpandedEntry}
                  onNewEntry={() => setShowEditor(true)}
                />
              )}
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              <JournalCalendarHeatmap entries={entries} onDayClick={handleDayClick} />
              <div className="surface-card p-4 gradient-warm">
                  <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber" /> Reflection Prompts
                  </h3>
                <div className="space-y-2">
                  {["What made you grateful today?", "What did you learn today?", "What moment made you smile?"].map((p, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4, rotate: 0 }}
                      onClick={() => setShowEditor(true)}
className="w-full text-left p-3 rounded-xl cursor-pointer transition-all font-handwritten text-base shadow-sm"
                      style={{
                        background: "hsl(48 80% 90%)",
                        color: "hsl(35 30% 25%)",
                        transform: `rotate(${(i % 3) - 1}deg)`,
                      }}
                    >
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === "writer" && showAIInsight && latestEntry && (
        <div className="fixed bottom-6 right-6 left-6 max-w-2xl mx-auto z-50 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-primary/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-lg">AI just analyzed your entry ✨</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-auto h-8"
              onClick={() => setShowAIInsight(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AIJournalInsight 
            entryId={latestEntry.id} 
            content={latestEntry.content} 
            title={latestEntry.title} 
            autoAnalyze={true}
          />
        </div>
      )}
      {view === "writer" && showAIInsight && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setShowAIInsight(false)} />
      )}

      {/* Legacy Editor */}
      <JournalEntryEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveEntry}
        editEntry={editingLegacyEntry}
        initialDate={initialDate}
      />

      {/* Expanded entry dialog */}
      <Dialog open={!!expandedEntry} onOpenChange={() => setExpandedEntry(null)}>
        <DialogContent className="w-full max-w-4xl max-h-[95vh] p-0 overflow-hidden rounded-2xl border-border/40 sm:max-w-3xl lg:max-w-4xl">
          {expandedEntry && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col"
            >
              <div className="p-6 sm:p-8 space-y-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(expandedEntry.date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
                  </p>
                  <span className="text-sm capitalize text-muted-foreground">{expandedEntry.mood}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                  {expandedEntry.title}
                </h2>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditFromExpanded(expandedEntry)}
                    className="h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDeleteEntry(expandedEntry.id)}
                    className="h-9 w-9 sm:h-10 sm:w-10 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Scrollable content area */}
              <div className="flex-1 min-h-[60vh] overflow-y-auto px-6 sm:px-8 pb-12 sm:pb-16 overscroll-contain scrollbar-thin scrollbar-w-4 scrollbar-track-transparent/30 scrollbar-thumb-muted-foreground/80 hover:scrollbar-thumb-foreground/70 scrollbar-thumb-rounded-full shadow-sm [&::-webkit-scrollbar-thumb]:hover:bg-foreground/50 scrollbar-width:thin">
                {/* Main content */}
                <div className="font-handwritten text-base sm:text-lg lg:text-xl xl:text-2xl text-foreground/90 leading-[1.75] max-w-4xl mx-auto mb-12 whitespace-pre-wrap pb-8 prose prose-headings:none prose-p:leading-relaxed">
                  {expandedEntry.content}
                </div>
                
                {/* Photos */}
                {expandedEntry.photos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
                    {expandedEntry.photos.map((photo, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden shadow-depth group hover:shadow-lifted transition-all aspect-video">
                        <img 
                          src={photo} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Voice note */}
                {expandedEntry.hasVoiceNote && (
                  <div className="surface-card p-6 sm:p-8 rounded-2xl mb-12 max-w-2xl mx-auto">
                    <VoiceNotePlayer />
                  </div>
                )}
                
                {/* Tags */}
                {expandedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-w-2xl mx-auto pt-8">
                    {expandedEntry.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full px-3 py-1 text-sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Journal;
