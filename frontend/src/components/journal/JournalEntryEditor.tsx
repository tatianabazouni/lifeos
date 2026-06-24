/**
 * JournalEntryEditor — Full-screen overlay editor.
 * Notebook-paper lines, sticky-note prompts, mood bounce, sticker tray,
 * character counter, save animation with page-flip sound + XP float.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Mic, Sticker, Check, Sparkles,
  Smile, Heart, Brain, Sun, Moon, Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useSound from "use-sound";

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

const moodOptions = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "grateful", emoji: "❤️", label: "Grateful" },
  { key: "reflective", emoji: "🧠", label: "Reflective" },
  { key: "motivated", emoji: "☀️", label: "Motivated" },
  { key: "calm", emoji: "🌙", label: "Calm" },
  { key: "sad", emoji: "☁️", label: "Sad" },
];

const stickerOptions = ["🌟", "❤️", "🌸", "🦋", "🌻", "✨", "🎵", "📌", "🍂", "💭", "🔥", "🌈", "🎯", "💫", "🫧"];

const reflectionPrompts = [
  "What made you grateful today?",
  "What did you learn today?",
  "What moment made you smile?",
  "What are you looking forward to?",
  "What challenged you today?",
  "Who made a difference in your day?",
];

interface JournalEntryEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
  editEntry?: JournalEntry | null;
  initialDate?: string;
}

const JournalEntryEditor = ({ open, onClose, onSave, editEntry, initialDate }: JournalEntryEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [stickers, setStickers] = useState<string[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [playFlip] = useSound("/sounds/page-flip.mp3", { volume: 0.5 });

  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title);
      setContent(editEntry.content);
      setMood(editEntry.mood);
      setPhotos(editEntry.photos);
      setStickers(editEntry.stickers);
      setEntryDate(editEntry.date);
    } else {
      setTitle("");
      setContent("");
      setMood(null);
      setPhotos([]);
      setStickers([]);
      setEntryDate(initialDate || new Date().toISOString().slice(0, 10));
    }
    setSaved(false);
    setShowXp(false);
  }, [editEntry, open, initialDate]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const toggleSticker = (s: string) =>
    setStickers((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const insertPrompt = (prompt: string) => {
    setContent((prev) => (prev ? prev + "\n\n" + prompt + "\n" : prompt + "\n"));
    textareaRef.current?.focus();
  };

const charCount = content.length;
  const charColor = charCount >= 1000 ? "text-golden" : charCount >= 500 ? "text-amber" : "text-muted-foreground/40";

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    playFlip();
    setSaved(true);
    setShowXp(true);

    setTimeout(() => {
      const entry: JournalEntry = {
        id: editEntry?.id || Date.now().toString(),
        date: entryDate || editEntry?.date || new Date().toISOString().slice(0, 10),
        title: title || "Untitled",
        content,
        mood: mood || "reflective",
        tags: mood ? [mood] : [],
        photos,
        hasVoiceNote: false,
        stickers,
      };
      onSave(entry);
      setTimeout(() => onClose(), 400);
    }, 800);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
        style={{
          background: "linear-gradient(135deg, hsl(35 40% 95%), hsl(40 35% 93%), hsl(30 30% 94%))",
          backgroundSize: "400% 400%",
          animation: "gradientShift 8s ease infinite",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-background transition-colors shadow-depth"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-2xl mx-4 my-8 space-y-6"
        >
          {/* Mood selector */}
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-muted-foreground">How are you feeling?</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {moodOptions.map((m) => {
                const isSelected = mood === m.key;
                return (
                  <motion.button
                    key={m.key}
                    whileTap={{ scale: 0.9 }}
                    animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                    transition={isSelected ? { type: "spring", stiffness: 500, damping: 15 } : {}}
                    onClick={() => setMood(m.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-background shadow-depth ring-2 ring-golden/50"
                        : "bg-background/40 hover:bg-background/60"
                    }`}
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="mood-glow"
                        className="absolute inset-0 rounded-2xl"
                        style={{ boxShadow: "0 0 20px hsl(44 100% 66% / 0.3)" }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title your day..."
            className="w-full bg-transparent border-0 outline-none font-display text-3xl font-bold text-foreground placeholder:text-muted-foreground/30 text-center"
          />

          {/* Content area with notebook lines */}
          <div
            className="bg-background/70 backdrop-blur-sm rounded-2xl border border-border/30 shadow-depth p-6 relative"
            style={{
              backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, hsl(220 15% 85% / 0.3) 31px, hsl(220 15% 85% / 0.3) 32px)",
              backgroundPosition: "0 8px",
            }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write about today..."
              className="w-full min-h-[280px] bg-transparent border-0 outline-none resize-none font-handwritten text-lg leading-8 text-foreground placeholder:text-muted-foreground/30"
            />
            {/* Character counter */}
            <p className={`absolute bottom-3 right-4 text-xs ${charColor} transition-colors`}>
              {charCount > 0 && `${charCount} chars`}
            </p>
          </div>

          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {photos.map((photo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex-shrink-0 group"
                >
                  <div
                    className="w-20 h-20 bg-card p-1 pb-4 rounded-sm shadow-depth"
                    style={{ transform: `rotate(${(i % 3) * 2 - 2}deg)` }}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover rounded-sm" />
                  </div>
                  <button
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 flex-shrink-0 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground/40 hover:border-primary/30 hover:text-primary/50 transition-colors"
              >
                <Camera className="h-6 w-6" />
              </motion.button>
            </div>
          )}

          {/* Sticker display */}
          {stickers.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {stickers.map((s, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: (i % 5) * 8 - 16 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="text-2xl cursor-pointer"
                  onClick={() => toggleSticker(s)}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {photos.length === 0 && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 border-border/50 bg-background/60" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4" /> Photo
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 border-border/50 bg-background/60">
              <Mic className="h-4 w-4" /> Voice
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 border-border/50 bg-background/60"
              onClick={() => setShowStickers(!showStickers)}
            >
              <Sticker className="h-4 w-4" /> Stickers
            </Button>
            <div className="flex-1" />

            {/* Save button */}
            <motion.div className="relative">
              <Button
                onClick={handleSave}
                disabled={saved || (!title.trim() && !content.trim())}
                className={`rounded-xl shadow-depth transition-all ${
                  saved
                    ? "bg-primary text-primary-foreground"
                    : "gradient-primary text-primary-foreground"
                }`}
              >
                <AnimatePresence mode="wait">
                  {saved ? (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Saved!
                    </motion.span>
                  ) : (
                    <motion.span key="save" className="flex items-center gap-1.5">
                      Save to your story ✨
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>

              {/* XP float */}
              <AnimatePresence>
                {showXp && (
                  <motion.span
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 font-display font-bold text-golden text-sm pointer-events-none"
                  >
                    +10 XP
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sticker tray */}
          <AnimatePresence>
            {showStickers && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 20, height: 0 }}
                className="bg-background/80 backdrop-blur-sm rounded-2xl border border-border/30 p-4 shadow-depth"
              >
                <p className="text-xs font-medium text-muted-foreground mb-3">Tap to add stickers</p>
                <div className="grid grid-cols-8 gap-2">
                  {stickerOptions.map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleSticker(s)}
                      className={`text-2xl p-2 rounded-xl transition-colors ${
                        stickers.includes(s) ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/30"
                      }`}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reflection prompts as sticky notes */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber" /> Reflection prompts
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {reflectionPrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ y: -4, rotate: 0, scale: 1.05 }}
                  onClick={() => insertPrompt(prompt)}
                  className="flex-shrink-0 px-4 py-3 rounded-xl text-sm text-left max-w-[200px] shadow-depth transition-all font-handwritten text-base"
                  style={{
                    background: "hsl(48 80% 90%)",
                    color: "hsl(35 30% 25%)",
                    transform: `rotate(${(i % 3) * 2 - 2}deg)`,
                  }}
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* CSS animation for gradient shift */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </AnimatePresence>
  );
};

export default JournalEntryEditor;
