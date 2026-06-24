/**
 * MemoryDetailPanel — Rich slide-in overlay for memory details.
 * Includes emotion visualization, delete action, and smooth animations.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, Heart, Calendar, Tag, Trash2, Sun, Moon, Leaf, Sparkles, Pencil, Save,
  FileText, Image, Mic, Video,
} from "lucide-react";
import type { MemoryItem } from "./MemoryVaultScene";
import { lifeApi } from "@/api/lifeApi";

const emotionConfig: Record<string, { icon: typeof Sun; color: string; label: string }> = {
  joy: { icon: Sun, label: "Joy", color: "bg-highlight/20 text-highlight" },
  calm: { icon: Moon, label: "Calm", color: "bg-calm/20 text-calm" },
  love: { icon: Heart, label: "Love", color: "bg-accent/20 text-accent" },
  nostalgia: { icon: Sparkles, label: "Nostalgia", color: "bg-primary/20 text-primary" },
  growth: { icon: Leaf, label: "Growth", color: "bg-growth/20 text-growth" },
};

const typeIcons: Record<string, typeof FileText> = {
  text: FileText, image: Image, voice: Mic, video: Video,
};

interface Props {
  memory: MemoryItem | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<MemoryItem>) => Promise<void> | void;
  chapters?: { id: string; label: string }[];
}

export function MemoryDetailPanel({ memory, onClose, onDelete, onUpdate, chapters = [] }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [chapter, setChapter] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  useEffect(() => {
    if (!memory) return;
    setIsEditing(false);
    setTitle(memory.title || "");
    setDescription(memory.description || "");
    setDate(memory.date || "");
    setChapter(String(memory.chapter || ""));
    setTagsInput(Array.isArray(memory.tags) ? memory.tags.join(", ") : "");
    setMediaFile(null);
  }, [memory]);

  const handleSave = async () => {
    if (!memory || !onUpdate) return;
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    let uploadedMediaUrl: string | undefined;
    if (mediaFile) {
      try {
        const uploadKind =
          memory.type === "image" ? "image" : memory.type === "video" ? "video" : memory.type === "voice" ? "audio" : null;
        if (uploadKind) {
          const uploaded = await lifeApi.uploadMemoryMedia(uploadKind, mediaFile);
          uploadedMediaUrl = uploaded.mediaUrl || uploaded.imageUrl || uploaded.url;
        }
      } catch (error) {
        const message =
          (error as { payload?: { message?: string }; message?: string })?.payload?.message
          || (error as { message?: string })?.message
          || "Failed to upload media";
        alert(message);
        return;
      }
    }

    await onUpdate(memory.id, {
      title: title.trim(),
      description: description.trim(),
      date,
      chapter,
      tags,
      ...(memory.type === "image" && uploadedMediaUrl ? { imageUrl: uploadedMediaUrl, mediaUrl: uploadedMediaUrl } : {}),
      ...(memory.type === "video" && uploadedMediaUrl ? { mediaUrl: uploadedMediaUrl } : {}),
      ...(memory.type === "voice" && uploadedMediaUrl ? { mediaUrl: uploadedMediaUrl } : {}),
    });
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {memory && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-background border-l border-border/30 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {(() => {
                  const TypeIcon = typeIcons[memory.type] || FileText;
                  return <TypeIcon className="h-4 w-4" />;
                })()}
                <span className="capitalize">{memory.type}</span>
              </div>
              <div className="flex items-center gap-1">
                {onUpdate && (
                  isEditing ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleSave()}
                      className="text-muted-foreground hover:text-primary h-8 w-8"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { onDelete(memory.id); onClose(); }}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Media */}
              {memory.type === "image" && memory.imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="aspect-video overflow-hidden bg-muted/20"
                >
                  <img
                    src={memory.imageUrl}
                    alt={memory.title}
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              )}
              {memory.type === "video" && memory.mediaUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                  className="aspect-video overflow-hidden bg-black"
                >
                  <video src={memory.mediaUrl} controls className="w-full h-full object-contain" />
                </motion.div>
              )}
              {memory.type === "voice" && memory.mediaUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 border-b border-border/20"
                >
                  <audio src={memory.mediaUrl} controls className="w-full" />
                </motion.div>
              )}

              <div className="p-6 space-y-5">
                {/* Emotion badge */}
                {(() => {
                  const cfg = emotionConfig[memory.emotion];
                  if (!cfg) return null;
                  const EmIcon = cfg.icon;
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <Badge className={`rounded-full text-xs ${cfg.color} border-0`}>
                        <EmIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </motion.div>
                  );
                })()}

                {/* Title */}
                {isEditing ? (
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background border-border/50" />
                ) : (
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="font-display text-2xl font-bold text-foreground leading-tight"
                  >
                    {memory.title}
                  </motion.h2>
                )}

                {/* Date */}
                {isEditing ? (
                  <div className="space-y-2">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background border-border/50" />
                    {chapters.length > 0 && (
                      <Select value={chapter} onValueChange={setChapter}>
                        <SelectTrigger className="bg-background border-border/50">
                          <SelectValue placeholder="Select chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {chapters.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(memory.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </motion.div>
                )}

                {/* Description */}
                {isEditing ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background border-border/50 min-h-[100px]"
                  />
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm"
                  >
                    {memory.description}
                  </motion.p>
                )}

                {/* Tags */}
                {isEditing ? (
                  <div className="space-y-2">
                    {(memory.type === "image" || memory.type === "video" || memory.type === "voice") && (
                      <Input
                        type="file"
                        accept={memory.type === "image" ? "image/*" : memory.type === "video" ? "video/*,.mp4,.webm,.mov,.mkv,.mpg,.mpeg" : "audio/*,.mp3,.wav,.m4a,.ogg,.webm"}
                        onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                        className="bg-background border-border/50"
                      />
                    )}
                    <Input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Tags separated by commas"
                      className="bg-background border-border/50"
                    />
                  </div>
                ) : memory.tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-1.5"
                  >
                    {memory.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] rounded-full border-border/40"
                      >
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </motion.div>
                )}

                {/* Chapter label */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs text-muted-foreground/50 italic text-center pt-4 border-t border-border/20"
                >
                  Chapter: {memory.chapter}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
