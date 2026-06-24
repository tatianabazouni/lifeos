/**
 * AddMemoryModal — Modal for creating a new memory item.
 * Supports text, image, voice, and video types with emotion tagging.
 * Includes success animation on save.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Image, Mic, Video, Heart, Sun, Leaf, Moon, Sparkles, X, Check,
} from "lucide-react";
import type { MemoryItem } from "./MemoryVaultScene";
import { lifeApi } from "@/api/lifeApi";

const CONTENT_TYPES = [
  { value: "text", label: "Note", icon: FileText },
  { value: "image", label: "Photo", icon: Image },
  { value: "voice", label: "Voice", icon: Mic },
  { value: "video", label: "Video", icon: Video },
] as const;

const EMOTIONS = [
  { value: "joy", label: "Joy", icon: Sun, color: "bg-highlight/20 text-highlight" },
  { value: "calm", label: "Calm", icon: Moon, color: "bg-calm/20 text-calm" },
  { value: "love", label: "Love", icon: Heart, color: "bg-accent/20 text-accent" },
  { value: "nostalgia", label: "Nostalgia", icon: Sparkles, color: "bg-secondary/20 text-secondary" },
  { value: "growth", label: "Growth", icon: Leaf, color: "bg-growth/20 text-growth" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (memory: Omit<MemoryItem, "id">) => void | Promise<void>;
  onCreateChapter: (title: string) => Promise<{ id: string; key: string; label: string } | null>;
  chapters: { id: string; key: string; label: string }[];
}

export function AddMemoryModal({ open, onClose, onSave, onCreateChapter, chapters }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [chapterId, setChapterId] = useState(chapters[0]?.id || "");
  const [type, setType] = useState<MemoryItem["type"]>("text");
  const [emotion, setEmotion] = useState<MemoryItem["emotion"]>("joy");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [chapterSelectOpen, setChapterSelectOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!chapterId && chapters.length > 0) {
      setChapterId(chapters[0].id);
    }
  }, [chapterId, chapters]);

  const uploadKindByType: Partial<Record<MemoryItem["type"], "image" | "video" | "audio">> = {
    image: "image",
    video: "video",
    voice: "audio",
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleAddChapter = async () => {
    const nextTitle = newChapterTitle.trim();
    if (!nextTitle) return;

    try {
      setIsAddingChapter(true);
      const chapter = await onCreateChapter(nextTitle);
      if (chapter?.id) {
        setChapterId(chapter.id);
        setChapterSelectOpen(false);
      }
      setNewChapterTitle("");
    } catch (err) {
      const message =
        (err as { payload?: { message?: string }; message?: string })?.payload?.message
        || (err as { message?: string })?.message
        || "Failed to create chapter";
      alert(message);
    } finally {
      setIsAddingChapter(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      const uploadKind = uploadKindByType[type];
      let uploadedMediaUrl: string | undefined;

      if (mediaFile && uploadKind) {
        const uploaded = await lifeApi.uploadMemoryMedia(uploadKind, mediaFile);
        uploadedMediaUrl = uploaded.mediaUrl || uploaded.imageUrl || uploaded.url;
      }

      const memory: Omit<MemoryItem, "id"> = {
        title: title.trim(),
        description: description.trim(),
        date,
        chapter: chapterId,
        tags,
        type,
        emotion,
        imageUrl: type === "image" ? uploadedMediaUrl : undefined,
        mediaUrl: uploadedMediaUrl,
      };

      await onSave(memory);

      setShowSuccess(true);

      setTimeout(() => {
        setTitle("");
        setDescription("");
        setMediaFile(null);
        setTags([]);
        setType("text");
        setEmotion("joy");
        setTagInput("");
        setChapterId(chapters[0]?.id || "");
        setShowSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      const message =
        (err as { payload?: { message?: string }; message?: string })?.payload?.message
        || (err as { message?: string })?.message
        || "Failed to save memory";

      console.error("REAL ERROR:", err);
      alert(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] border-border/20 bg-background">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Check className="h-8 w-8 text-primary" />
              </motion.div>
              <p className="font-display text-lg font-semibold text-foreground">Memory saved!</p>
              <p className="text-sm text-muted-foreground">Another moment preserved in your story.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-highlight" />
                  Add a Memory
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Title */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <Input
                    placeholder="What do you want to remember?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-muted/30 border-border/30 font-display text-lg"
                  />
                </motion.div>

                {/* Description */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Textarea
                    placeholder="Describe this memory… What happened? How did it feel?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-muted/30 border-border/30 min-h-[100px] font-handwritten text-base"
                  />
                </motion.div>

                {/* Row: Date + Chapter */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-muted/30 border-border/30 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Life Chapter</label>
                    <Select open={chapterSelectOpen} onOpenChange={setChapterSelectOpen} value={chapterId} onValueChange={setChapterId}>
                      <SelectTrigger className="bg-muted/30 border-border/30 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chapters.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>
                        ))}
                        <div className="px-2 pt-2 border-t border-border/40 mt-1" onPointerDown={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="New chapter..."
                              value={newChapterTitle}
                              onChange={(e) => setNewChapterTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleAddChapter();
                                }
                              }}
                              className="h-8 text-xs bg-background border-border/40"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => void handleAddChapter()}
                              disabled={isAddingChapter || !newChapterTitle.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Content type */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <label className="text-xs text-muted-foreground mb-2 block">Type</label>
                  <div className="flex gap-2">
                    {CONTENT_TYPES.map((ct) => {
                      const Icon = ct.icon;
                      const active = type === ct.value;
                      return (
                        <Button
                          key={ct.value}
                          variant={active ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            const nextType = ct.value as MemoryItem["type"];
                            setType(nextType);
                            if (nextType === "image" || nextType === "video" || nextType === "voice") {
                              setTimeout(() => fileInputRef.current?.click(), 0);
                            }
                          }}
                          className={`text-xs rounded-full ${active ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          <Icon className="h-3 w-3 mr-1" /> {ct.label}
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Emotion */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <label className="text-xs text-muted-foreground mb-2 block">How did this feel?</label>
                  <div className="flex gap-2 flex-wrap">
                    {EMOTIONS.map((em) => {
                      const Icon = em.icon;
                      const active = emotion === em.value;
                      return (
                        <motion.button
                          key={em.value}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEmotion(em.value as MemoryItem["emotion"])}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                            active ? em.color + " ring-2 ring-offset-1 ring-current scale-105" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="h-3 w-3" /> {em.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Media upload */}
                <AnimatePresence>
                  {(type === "image" || type === "video" || type === "voice") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept={type === "image" ? "image/*" : type === "video" ? "video/*,.mp4,.webm,.mov,.mkv,.mpg,.mpeg" : "audio/*,.mp3,.wav,.m4a,.ogg,.webm"}
                        onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                        className="bg-muted/30 border-border/30 text-sm"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tags */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      className="bg-muted/30 border-border/30 text-sm flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={addTag} className="text-xs">Add</Button>
                  </div>
                  <AnimatePresence>
                    {tags.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-1 mt-2"
                      >
                        {tags.map((tag) => (
                          <motion.div key={tag} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Badge variant="outline" className="text-[10px] rounded-full cursor-pointer hover:bg-destructive/10"
                              onClick={() => setTags(tags.filter(t => t !== tag))}
                            >
                              {tag} <X className="h-2.5 w-2.5 ml-1" />
                            </Badge>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={onClose} className="text-muted-foreground">Cancel</Button>
                <Button onClick={handleSave} disabled={!title.trim()} className="gradient-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Save Memory
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
