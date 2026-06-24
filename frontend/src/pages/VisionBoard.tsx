import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Target,
  Sparkles,
  Star,
  Search,
  ChevronDown,
  Calendar,
  Heart,
  CheckCircle2,
  Trophy,
  X,
  Eye,
  Upload,
  Camera,
  Layout,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  GripVertical,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { visionApi } from "@/api/visionApi";
import { connectionApi } from "@/api/connectionApi";
import { authStore } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Cropper from "react-easy-crop";

// ===== TYPES =====
interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface Dream {
  id: string;
  boardId: string;
  title: string;
  description: string;
  targetYear: number;
  motivation: string;
  imageUrl: string;
  imageScale?: number;
  imagePosition?: string;
  category: DreamCategory;
  tags: string[];
  convertedToGoal: boolean;
  achieved: boolean;
  achievedPhotoUrl?: string;
  achievedNote?: string;
  subtasks: Subtask[];
  createdAt: string;
  order: number;
}

type DreamCategory = string;

interface GoalPlanAnalysis {
  visionSummary?: string;
  domain?: string;
  transformationType?: string;
  hiddenRequirements?: string[];
  requiredSkills?: string[];
  transformationComponents?: string[];
  successDefinition?: string;
}

interface GoalPlanPhase {
  title: string;
  deadline: string;
  milestones: string[];
  actionSteps: string[];
}

interface GoalPlan {
  goalTitle?: string;
  analysis?: GoalPlanAnalysis;
  phases: GoalPlanPhase[];
  successIndicators?: string[];
  personalReminder?: string;
  milestones?: string[];
  source?: string;
}

interface Board {
  id: string;
  name: string;
  emoji: string;
  order: number;
  createdAt: string;
  isOwner?: boolean;
  sharedWithUsers?: FriendOption[];
  owner?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

interface FriendOption {
  userId: string;
  name: string;
}

const DEFAULT_DREAM_CATEGORY = "personal";
const CUSTOM_CATEGORY_VALUE = "__custom__";
const defaultDreamCategories = ["personal", "travel", "career", "relationships", "health"] as const;
const defaultDreamCategorySet = new Set<string>(defaultDreamCategories);
const AI_THINKING_STATES = [
  "Analyzing your vision...",
  "Detecting required skills...",
  "Understanding transformation path...",
  "Building milestone system...",
  "Generating execution roadmap...",
];

const categoryEmojis: Record<string, string> = {
  personal: "✨",
  travel: "🌍",
  career: "🚀",
  relationships: "💕",
  health: "🌿",
};

const boardEmojiOptions = ["🌟", "🎯", "💫", "🌈", "🔥", "🌊", "🏔️", "🦋", "🌸", "⚡", "🎨", "💎"];

const normalizeCategory = (value?: string | null) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized || DEFAULT_DREAM_CATEGORY;
};

const formatCategoryLabel = (value?: string | null) =>
  normalizeCategory(value).replace(/\b\w/g, (char) => char.toUpperCase());

const getCategoryEmoji = (value?: string | null) =>
  categoryEmojis[normalizeCategory(value)] || "\uD83C\uDFF7\uFE0F";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");
const resolveMediaUrl = (value?: string) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${apiOrigin}${value}`;
  return value;
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (error) => reject(error));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const safeArea = Math.max(image.width, image.height) * 2;
  canvas.width = safeArea;
  canvas.height = safeArea;
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, (safeArea - image.width) / 2, (safeArea - image.height) / 2);

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"));
      resolve(blob);
    }, "image/jpeg");
  });
};

// ===== FLOATING DECORATIONS =====
const FloatingParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-golden/40"
        style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 30}%` }}
        animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
      />
    ))}
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={`star-${i}`}
        className="absolute text-golden/20"
        style={{ right: `${10 + i * 20}%`, top: `${5 + i * 25}%` }}
        animate={{ rotate: [0, 180, 360], opacity: [0.1, 0.3, 0.1], scale: [0.6, 1, 0.6] }}
        transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
      >
        <Star className="h-3 w-3" />
      </motion.div>
    ))}
  </div>
);

// ===== IMAGE UPLOAD =====
const ImageUploadZone = ({
  imageUrl,
  onImageChange,
  onUploadFile,
  label,
  height = "h-40",
  className = "",
}: {
  imageUrl: string;
  onImageChange: (url: string) => void;
  onUploadFile?: (file: File) => Promise<string>;
  label?: string;
  height?: string;
  className?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      try {
        if (onUploadFile) {
          const uploadedUrl = await onUploadFile(file);
          onImageChange(uploadedUrl);
        } else {
          onImageChange(URL.createObjectURL(file));
        }
      } catch (error) {
        console.error("Vision image upload failed", error);
        alert((error as { message?: string })?.message || "Failed to upload image");
      }
    },
    [onImageChange, onUploadFile]
  );
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {imageUrl ? (
        <div className={`relative rounded-xl overflow-hidden ${height} group/img`}>
          <img src={imageUrl} alt="Upload" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover/img:bg-foreground/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover/img:opacity-100 transition-opacity flex gap-2">
              <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Camera className="h-3 w-3 mr-1" /> Change
              </Button>
              <Button size="sm" variant="secondary" className="rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); onImageChange(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          className={`relative rounded-xl border-2 border-dashed border-border hover:border-primary/40 ${height} flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/30`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground font-medium">{label || "Drop an image or click to upload"}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP</p>
        </motion.div>
      )}
    </div>
  );
};

// ===== EMPTY STATES =====
const EmptyBoardState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="relative flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div className="w-64 h-64 rounded-full border border-golden/10" animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div className="absolute w-48 h-48 rounded-full border border-coral/10" animate={{ scale: [1.05, 1, 1.05], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }} />
      <motion.div className="absolute w-32 h-32 rounded-full border border-teal/15" animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3.5, repeat: Infinity, delay: 1 }} />
    </div>
    <motion.div className="relative z-10" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 100 }}>
      <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center mb-6 mx-auto shadow-glow-golden">
        <Sparkles className="h-8 w-8 text-amber" />
      </div>
      <h2 className="font-display text-3xl font-bold text-foreground mb-3">Start imagining your future today</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-2 text-base">
        Your vision board is where dreams take shape. Create a board, pin your dreams, and watch them evolve into goals.
      </p>
      <p className="font-handwritten text-lg text-amber mb-8">Every journey begins with a vision ✦</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 text-base shadow-glow-teal">
        <FolderPlus className="mr-2 h-5 w-5" /> Create your first board
      </Button>
    </motion.div>
  </motion.div>
);

const EmptyDreamState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className="relative flex flex-col items-center justify-center py-16 text-center"
  >
    <FloatingParticles />
    <motion.div className="relative z-10" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
      <div className="w-16 h-16 rounded-full gradient-warm flex items-center justify-center mb-5 mx-auto shadow-glow-golden">
        <Sparkles className="h-7 w-7 text-amber" />
      </div>
      <h3 className="font-display text-2xl font-bold text-foreground mb-2">Start imagining your future today</h3>
      <p className="text-muted-foreground max-w-sm mx-auto mb-2 text-sm">
        This board is waiting for your aspirations. Pin your dreams and watch them transform into reality.
      </p>
      <p className="font-handwritten text-base text-amber mb-6">Every great story begins with a dream ✦</p>
      <Button onClick={onAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 shadow-glow-teal">
        <Plus className="mr-2 h-4 w-4" /> Pin your first dream
      </Button>
    </motion.div>
  </motion.div>
);

// ===== DREAM CARD =====
const DreamCard = ({
  dream,
  index,
  onExpand,
  onEdit,
  onDelete,
}: {
  dream: Dream;
  index: number;
  onExpand: (dream: Dream) => void;
  onEdit: (dream: Dream) => void;
  onDelete: (id: string) => void;
}) => {
  const [zoomed, setZoomed] = useState(false);
  const progress = dream.subtasks.length > 0
    ? Math.round((dream.subtasks.filter((s) => s.done).length / dream.subtasks.length) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
      className="break-inside-avoid group cursor-pointer mb-4"
      onClick={() => onExpand(dream)}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`surface-scrapbook rounded-2xl overflow-hidden relative ${dream.achieved ? "ring-2 ring-golden/40 shadow-glow-golden" : ""}`}
      >
        {index % 3 === 0 && <div className="tape-effect" />}

        {/* Card actions */}
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(dream); }}
            className="p-1.5 rounded-lg bg-card/80 backdrop-blur-sm hover:bg-card transition-colors shadow-sm"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(dream.id); }}
            className="p-1.5 rounded-lg bg-card/80 backdrop-blur-sm hover:bg-destructive/10 transition-colors shadow-sm"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>

        {dream.achieved && (
          <motion.div className="absolute inset-0 z-10 pointer-events-none" animate={{ opacity: [0.05, 0.12, 0.05] }} transition={{ duration: 3, repeat: Infinity }}>
            <div className="absolute inset-0 bg-gradient-to-br from-golden/10 via-transparent to-amber/10 rounded-2xl" />
          </motion.div>
        )}

        {dream.imageUrl && (
          <div
            className="overflow-hidden relative h-56 bg-muted/40 cursor-zoom-in"
            onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          >
            <motion.img
              src={dream.imageUrl}
              alt={dream.title}
              className="w-full h-full object-cover transition-transform duration-700"
              style={{
                transform: `scale(${(dream.imageScale || 1) * (zoomed ? 1.25 : 1)})`,
                transformOrigin: "center",
                objectPosition: dream.imagePosition || "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
            {dream.achieved && (
              <motion.div className="absolute top-3 left-3 z-20" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
                <div className="flex items-center gap-1 bg-golden/90 text-golden-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-glow-golden">
                  <Trophy className="h-3 w-3" /> Achieved
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs capitalize gap-1 rounded-full">
              {getCategoryEmoji(dream.category)} {formatCategoryLabel(dream.category)}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {dream.targetYear}
            </span>
          </div>
          <h3 className="font-display font-semibold text-base text-foreground leading-snug">{dream.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{dream.description}</p>
          {dream.motivation && <p className="font-handwritten text-sm text-amber italic">"{dream.motivation}"</p>}

          {dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dream.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">#{tag}</span>
              ))}
            </div>
          )}

          {dream.convertedToGoal && !dream.achieved && (
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3 text-teal" /> Goal Progress</span>
                <span className="font-semibold text-teal">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="pt-1">
            <motion.div className="text-xs text-muted-foreground/60 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-3 w-3" /> Click to explore
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-4 w-4 text-golden/50" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// ===== DREAM DETAIL DIALOG =====
const DreamDetailDialog = ({
  dream,
  open,
  onClose,
  onConvertToGoal,
  onMarkAchieved,
  onToggleSubtask,
  onUpdateImage,
  onEdit,
  onDelete,
  uploadImageFile,
  onStartCrop,
}: {
  dream: Dream | null; open: boolean; onClose: () => void;
  onConvertToGoal: (id: string) => void;
  onMarkAchieved: (id: string, photoUrl?: string, note?: string) => void;
  onToggleSubtask: (dreamId: string, subtaskId: string) => void;
  onUpdateImage: (id: string, imageUrl: string) => void;
  onEdit: (dream: Dream) => void;
  onDelete: (id: string) => void;
  uploadImageFile: (file: File) => Promise<string>;
  onStartCrop: (file: File, onDone: (url: string) => void) => void;
}) => {
  const [achievePhotoUrl, setAchievePhotoUrl] = useState("");
  const [achieveNote, setAchieveNote] = useState("");
  const [zoomed, setZoomed] = useState(false);
  if (!dream) return null;

  const progress = dream.subtasks.length > 0
    ? Math.round((dream.subtasks.filter((s) => s.done).length / dream.subtasks.length) * 100)
    : 0;
  const allDone = dream.subtasks.length > 0 && dream.subtasks.every((s) => s.done);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl surface-scrapbook border-border/60 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {dream.imageUrl ? (
          <div
            className="relative h-48 overflow-hidden cursor-zoom-in"
            onClick={() => setZoomed((z) => !z)}
          >
            <img
              src={dream.imageUrl}
              alt={dream.title}
              className="w-full h-full object-cover transition-transform duration-500"
              style={{
                transform: `scale(${(dream.imageScale || 1) * (zoomed ? 1.25 : 1)})`,
                transformOrigin: "center",
                objectPosition: dream.imagePosition || "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
            {dream.achieved && (
              <motion.div className="absolute top-4 right-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <div className="flex items-center gap-1.5 bg-golden text-golden-foreground rounded-full px-4 py-1.5 text-sm font-bold shadow-glow-golden">
                  <Trophy className="h-4 w-4" /> Dream Achieved
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="px-6 pt-6">
            <ImageUploadZone
              imageUrl=""
              onImageChange={() => undefined}
              onUploadFile={(file) =>
                new Promise<void>((resolve, reject) => {
                  onStartCrop(file, async (url) => {
                    try {
                      await onUpdateImage(dream.id, url);
                      resolve();
                    } catch (e) {
                      reject(e);
                    }
                  });
                })
              }
              label="Add an image for this dream"
              height="h-36"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="capitalize rounded-full text-xs">{getCategoryEmoji(dream.category)} {formatCategoryLabel(dream.category)}</Badge>
              <span className="text-xs text-muted-foreground">Target: {dream.targetYear}</span>
            </div>
            <DialogTitle className="font-display text-2xl">{dream.title}</DialogTitle>
            <DialogDescription className="text-base">{dream.description}</DialogDescription>
          </DialogHeader>

          {dream.motivation && (
            <div className="gradient-warm rounded-xl p-4">
              <p className="font-handwritten text-lg text-amber italic">"{dream.motivation}"</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Heart className="h-3 w-3 text-coral" /> Your motivation</p>
            </div>
          )}

          {dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dream.tags.map((tag) => <Badge key={tag} variant="outline" className="rounded-full text-xs">#{tag}</Badge>)}
            </div>
          )}

          {dream.convertedToGoal && (
            <div className="space-y-3 bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5"><Target className="h-4 w-4 text-teal" /> Goal Progress</h4>
                <span className="text-sm font-bold text-teal">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {dream.subtasks.length > 0 && (
                <div className="space-y-2 mt-2">
                  {dream.subtasks.map((task) => (
                    <motion.button
                      key={task.id}
                      className="flex items-center gap-2 w-full text-left text-sm hover:bg-muted rounded-lg px-2 py-1.5 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onToggleSubtask(dream.id, task.id); }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${task.done ? "text-teal fill-teal/20" : "text-muted-foreground"}`} />
                      <span className={task.done ? "line-through text-muted-foreground" : "text-foreground"}>{task.title}</span>
                    </motion.button>
                  ))}
                </div>
              )}
              {allDone && !dream.achieved && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gradient-coral rounded-xl p-4 mt-2 space-y-3">
                  <div className="text-center">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Sparkles className="h-6 w-6 text-golden mx-auto mb-2" />
                    </motion.div>
                    <p className="font-display text-sm font-semibold text-foreground">All tasks complete!</p>
                    <p className="text-xs text-muted-foreground mb-2">Celebrate your dream — add a photo of your reality</p>
                  </div>
                  <ImageUploadZone imageUrl={achievePhotoUrl} onImageChange={setAchievePhotoUrl} label="Upload a photo of your achieved dream" height="h-28" />
                  <Input placeholder="Write a reflection note..." value={achieveNote} onChange={(e) => setAchieveNote(e.target.value)} className="rounded-xl text-sm" />
                  <Button
                    size="sm"
                    className="w-full bg-golden text-golden-foreground hover:bg-golden/90 shadow-glow-golden"
                    onClick={() => { onMarkAchieved(dream.id, achievePhotoUrl, achieveNote); setAchievePhotoUrl(""); setAchieveNote(""); }}
                  >
                    <Trophy className="mr-1 h-3 w-3" /> Mark as Achieved
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {dream.achieved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl overflow-hidden border border-golden/20">
              {dream.achievedPhotoUrl && <img src={dream.achievedPhotoUrl} alt="Achieved" className="w-full h-40 object-cover" />}
              {dream.achievedNote && (
                <div className="p-3 bg-golden/5"><p className="font-handwritten text-sm text-amber">{dream.achievedNote}</p></div>
              )}
            </motion.div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(dream); }} className="rounded-xl">
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => { onDelete(dream.id); onClose(); }} className="rounded-xl text-destructive hover:text-destructive">
                <Trash2 className="mr-1 h-3 w-3" /> Delete
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              {!dream.convertedToGoal && !dream.achieved && (
                <Button onClick={() => onConvertToGoal(dream.id)} className="bg-teal text-teal-foreground hover:bg-teal/90 rounded-xl">
                  <Target className="mr-2 h-4 w-4" /> Convert to Goal
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== ADD / EDIT DREAM DIALOG =====
const DreamFormDialog = ({
  open, onClose, onSubmit, boardId, editDream, uploadImageFile, onStartCrop,
}: {
  open: boolean; onClose: () => void; boardId: string;
  onSubmit: (dream: Omit<Dream, "id" | "convertedToGoal" | "achieved" | "subtasks" | "createdAt" | "order">) => void;
  editDream?: Dream | null;
  uploadImageFile: (file: File) => Promise<string>;
  onStartCrop: (file: File, onDone: (url: string) => void) => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [motivation, setMotivation] = useState("");
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_DREAM_CATEGORY);
  const [customCategory, setCustomCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState("center");

  const isEditing = !!editDream;
  const resolvedCategory = normalizeCategory(
    selectedCategory === CUSTOM_CATEGORY_VALUE ? customCategory : selectedCategory
  );
  const canSubmit = Boolean(
    title.trim() &&
    (selectedCategory !== CUSTOM_CATEGORY_VALUE || customCategory.trim())
  );

  // Populate form when editing
  useEffect(() => {
    if (editDream) {
      setTitle(editDream.title);
      setDescription(editDream.description);
      setMotivation(editDream.motivation);
      setTargetYear(editDream.targetYear);
      const normalizedCategory = normalizeCategory(editDream.category);
      if (defaultDreamCategorySet.has(normalizedCategory)) {
        setSelectedCategory(normalizedCategory);
        setCustomCategory("");
      } else {
        setSelectedCategory(CUSTOM_CATEGORY_VALUE);
        setCustomCategory(normalizedCategory);
      }
      setTags(editDream.tags);
      setImageUrl(editDream.imageUrl);
      setImageScale(editDream.imageScale || 1);
      setImagePosition(editDream.imagePosition || "center");
    } else {
      setTitle(""); setDescription(""); setMotivation(""); setTags([]); setTagInput(""); setImageUrl("");
      setImageScale(1); setImagePosition("center");
      setTargetYear(new Date().getFullYear() + 1);
      setSelectedCategory(DEFAULT_DREAM_CATEGORY);
      setCustomCategory("");
    }
  }, [editDream, open]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      boardId: editDream?.boardId || boardId,
      title,
      description,
      motivation,
      targetYear,
      category: resolvedCategory,
      tags,
      imageUrl,
      imageScale,
      imagePosition,
    });
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg surface-scrapbook max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-golden" /> {isEditing ? "Edit Dream" : "Add a New Dream"}
          </DialogTitle>
          <DialogDescription>{isEditing ? "Update your dream details." : "What do you dare to dream? Pin it to your board."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Dream Image</label>
            <ImageUploadZone
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              onUploadFile={(file) =>
                new Promise<void>((resolve, reject) => {
                  onStartCrop(file, async (url) => {
                    try {
                      setImageUrl(url);
                      resolve();
                    } catch (e) {
                      reject(e);
                    }
                  });
                })
              }
              label="Add an image that represents your dream"
              height="h-36"
            />
            {imageUrl && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Zoom/Crop</label>
                  <input
                    type="range"
                    min={1}
                    max={2}
                    step={0.05}
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Focus</label>
                  <select
                    value={imagePosition}
                    onChange={(e) => setImagePosition(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Dream Title</label>
            <Input placeholder="e.g., Travel to Japan" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea placeholder="Describe your dream in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 rounded-xl min-h-[70px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">What motivates you?</label>
            <Input placeholder="Your personal motivation..." value={motivation} onChange={(e) => setMotivation(e.target.value)} className="mt-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Target Year</label>
              <Input type="number" min={new Date().getFullYear()} max={2100} value={targetYear} onChange={(e) => setTargetYear(Number(e.target.value))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {defaultDreamCategories.map((option) => (
                  <option key={option} value={option}>
                    {getCategoryEmoji(option)} {formatCategoryLabel(option)}
                  </option>
                ))}
                <option value={CUSTOM_CATEGORY_VALUE}>🏷️ Custom</option>
              </select>
              {selectedCategory === CUSTOM_CATEGORY_VALUE && (
                <Input
                  placeholder="e.g., finance, spirituality, self growth"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2 rounded-xl"
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Tags</label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="Add a tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} className="rounded-xl" />
              <Button variant="outline" size="sm" onClick={addTag} className="rounded-xl">Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-xs cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    #{tag} <X className="h-2 w-2 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-primary hover:bg-primary/90 rounded-xl">
            <Sparkles className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Pin Dream"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== BOARD MANAGEMENT DIALOGS =====
const CreateBoardDialog = ({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (name: string, emoji: string) => void;
}) => {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌟");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm surface-scrapbook">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-teal" /> New Vision Board
          </DialogTitle>
          <DialogDescription>Create a new board to organize your dreams.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Board Name</label>
            <Input placeholder="e.g., 2026 Dreams, Travel Goals..." value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Choose Icon</label>
            <div className="flex flex-wrap gap-2">
              {boardEmojiOptions.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${e === emoji ? "bg-primary/15 ring-2 ring-primary scale-110" : "bg-muted hover:bg-muted/80"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={() => { if (name.trim()) { onAdd(name, emoji); setName(""); setEmoji("🌟"); onClose(); } }} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RenameBoardDialog = ({ open, onClose, board, onRename }: {
  open: boolean; onClose: () => void; board: Board | null;
  onRename: (id: string, name: string, emoji: string) => void;
}) => {
  const [name, setName] = useState(board?.name || "");
  const [emoji, setEmoji] = useState(board?.emoji || "🌟");

  const prevId = useRef(board?.id);
  if (board && board.id !== prevId.current) {
    prevId.current = board.id;
    setName(board.name);
    setEmoji(board.emoji);
  }

  if (!board) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm surface-scrapbook">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2"><Pencil className="h-4 w-4 text-teal" /> Edit Board</DialogTitle>
          <DialogDescription>Update your board's name and icon.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {boardEmojiOptions.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${e === emoji ? "bg-primary/15 ring-2 ring-primary scale-110" : "bg-muted hover:bg-muted/80"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={() => { if (name.trim()) { onRename(board.id, name, emoji); onClose(); } }} className="bg-primary hover:bg-primary/90 rounded-xl">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== SECTION HEADER =====
const SectionHeader = ({ icon: Icon, title, subtitle, count, expanded, onToggle }: {
  icon: React.ElementType; title: string; subtitle: string; count: number; expanded: boolean; onToggle: () => void;
}) => (
  <motion.button onClick={onToggle} className="w-full flex items-center justify-between py-3 group" whileTap={{ scale: 0.99 }}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center">
        <Icon className="h-4 w-4 text-teal" />
      </div>
      <div className="text-left">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {title} <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">({count})</span>
        </h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
      <ChevronDown className="h-5 w-5 text-muted-foreground" />
    </motion.div>
  </motion.button>
);

// ===== BOARD TAB =====
const BoardTab = ({ board, isActive, onClick, onEdit, onDelete, dreamCount }: {
  board: Board; isActive: boolean; onClick: () => void;
  onEdit: () => void; onDelete: () => void; dreamCount: number;
}) => (
  <motion.div
    layout
    className={`
      relative flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all group shrink-0
      ${isActive
        ? "surface-scrapbook shadow-depth ring-1 ring-primary/20"
        : "hover:bg-muted/60"
      }
    `}
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="text-lg">{board.emoji}</span>
    <span className={`text-sm font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
      {board.name}
    </span>
    <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0 min-w-[18px] text-center">
      {dreamCount}
    </Badge>

    {isActive && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="ml-1 p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}

    {isActive && (
      <motion.div layoutId="board-indicator" className="absolute -bottom-0.5 left-4 right-4 h-0.5 bg-primary rounded-full" />
    )}
  </motion.div>
);

// ===== MAIN PAGE =====
const VisionBoard = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dreamFormOpen, setDreamFormOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [renameBoardOpen, setRenameBoardOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dreamsExpanded, setDreamsExpanded] = useState(true);
  const [achievedExpanded, setAchievedExpanded] = useState(true);
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFriendToShare, setSelectedFriendToShare] = useState("");
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [shareStatus, setShareStatus] = useState("");
  // upload/crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadQueue, setUploadQueue] = useState<{ name: string; progress: number; status: "pending" | "uploading" | "done" | "error" }[]>([]);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [pendingCropDone, setPendingCropDone] = useState<((url: string) => void) | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [goalPlan, setGoalPlan] = useState<GoalPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planDreamId, setPlanDreamId] = useState<string | null>(null);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [regeneratingPhaseIndex, setRegeneratingPhaseIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [boardData, dreamData, connectionData] = await Promise.all([
        visionApi.getBoards() as Promise<any[]>,
        visionApi.getVisionItems() as Promise<any[]>,
        connectionApi.getConnections() as Promise<any[]>,
      ]);
      const mappedBoards: Board[] = boardData.map((board, index) => ({
        id: board.id || board._id,
        name: board.title || "Vision Board",
        emoji: "🌟",
        order: Number(board.order ?? index),
        createdAt: board.createdAt || new Date().toISOString(),
        isOwner: board.isOwner !== false,
        owner: board.owner
          ? {
              id: String(board.owner.id || board.owner._id),
              name: board.owner.name || "Unknown",
              email: board.owner.email || "",
            }
          : null,
        sharedWithUsers: Array.isArray(board.sharedWithUsers)
          ? board.sharedWithUsers.map((member: any) => ({
              userId: String(member.id || member._id),
              name: member.name || "Unknown",
            }))
          : [],
      }));
      const mappedDreams: Dream[] = dreamData.map((dream, index) => ({
        id: dream.id || dream._id,
        boardId: String(dream.boardId || dream.board),
        title: dream.title,
        description: dream.description || "",
        targetYear: Number(dream.targetYear || new Date().getFullYear() + 1),
        motivation: dream.motivation || "",
        imageUrl: resolveMediaUrl(dream.imageUrl || dream.image),
        imageScale: Number(dream.imageScale || 1),
        imagePosition: dream.imagePosition || "center",
        category: normalizeCategory(dream.category),
        tags: Array.isArray(dream.tags) ? dream.tags : [],
        convertedToGoal: !!dream.convertedToGoal,
        achieved: !!dream.achieved,
        achievedPhotoUrl: resolveMediaUrl(dream.achievedPhotoUrl),
        achievedNote: dream.achievedNote,
        subtasks: Array.isArray(dream.subtasks) ? dream.subtasks : [],
        createdAt: dream.createdAt || new Date().toISOString(),
        order: Number(dream.order ?? index),
      }));
      const mappedFriends: FriendOption[] = (Array.isArray(connectionData) ? connectionData : [])
        .filter((connection) => connection.status === "accepted" && connection.userId)
        .map((connection) => ({
          userId: connection.userId,
          name: connection.name || "Unknown",
        }));
      setBoards(mappedBoards);
      setDreams(mappedDreams);
      setFriends(mappedFriends);
      setActiveBoardId((prev) => prev || mappedBoards[0]?.id || null);
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (!planLoading) {
      setThinkingIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % AI_THINKING_STATES.length);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [planLoading]);

  const uploadVisionImage = useCallback(async (file: File) => {
    const name = file.name;
    setUploadQueue((prev) => [...prev, { name, progress: 0, status: "pending" }]);
    let uploadedUrl = "";
    try {
      const uploaded = await visionApi.uploadImageWithProgress(file, (p) => {
        setUploadQueue((prev) =>
          prev.map((u) => (u.name === name ? { ...u, progress: p, status: "uploading" } : u))
        );
      });
      const url = uploaded.mediaUrl || uploaded.imageUrl || uploaded.url;
      uploadedUrl = resolveMediaUrl(url);
      setUploadQueue((prev) => prev.map((u) => (u.name === name ? { ...u, progress: 100, status: "done" } : u)));
      return uploadedUrl;
    } catch (error) {
      setUploadQueue((prev) => prev.map((u) => (u.name === name ? { ...u, status: "error" } : u)));
      throw error;
    }
  }, []);

  const handleStartCrop = (file: File, onDone: (url: string) => void) => {
    setPendingCropFile(file);
    setPendingCropDone(() => onDone);
    setCropSrc(URL.createObjectURL(file));
    setCropModalOpen(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleApplyCrop = async () => {
    if (!pendingCropFile || !cropSrc || !croppedAreaPixels || !pendingCropDone) {
      setCropModalOpen(false);
      return;
    }
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels, rotation);
      const croppedFile = new File([blob], pendingCropFile.name, { type: "image/jpeg" });
      const url = await uploadVisionImage(croppedFile);
      pendingCropDone(url);
    } catch (e) {
      alert((e as { message?: string }).message || "Failed to crop image");
    } finally {
      setCropModalOpen(false);
      setPendingCropFile(null);
      setPendingCropDone(null);
      setCropSrc("");
    }
  };

  const activeBoard = boards.find((b) => b.id === activeBoardId) || null;
  const currentUserId = String(authStore.getUser()?.id || "");
  const activeBoardSharedWithLabel = useMemo(() => {
    if (!activeBoard) return "";

    const ownerId = String(activeBoard.owner?.id || "");
    const viewerIsOwner = activeBoard.isOwner || (ownerId && ownerId === currentUserId);
    const sharedUsers = Array.isArray(activeBoard.sharedWithUsers) ? activeBoard.sharedWithUsers : [];

    const targets = viewerIsOwner
      ? sharedUsers
      : [
          ...(activeBoard.owner ? [{ userId: ownerId, name: activeBoard.owner.name || "Unknown" }] : []),
          ...sharedUsers.filter((member) => member.userId !== currentUserId && member.userId !== ownerId),
        ];

    if (targets.length === 0) return "";
    if (targets.length === 1) return `Shared with ${targets[0].name}`;
    if (targets.length === 2) return `Shared with ${targets[0].name} and ${targets[1].name}`;
    return `Shared with ${targets[0].name}, ${targets[1].name} and ${targets.length - 2} others`;
  }, [activeBoard, currentUserId]);

  const filteredBoards = useMemo(() => {
    if (!boardSearchQuery) return boards;
    return boards.filter((b) => b.name.toLowerCase().includes(boardSearchQuery.toLowerCase()));
  }, [boards, boardSearchQuery]);

  const boardDreams = useMemo(() => {
    if (!activeBoardId) return [];
    return dreams.filter((d) => d.boardId === activeBoardId);
  }, [dreams, activeBoardId]);

  const categoryFilters = useMemo(() => {
    const boardCategories = Array.from(new Set(boardDreams.map((dream) => normalizeCategory(dream.category))));
    const builtInCategories = defaultDreamCategories.filter((category) => boardCategories.includes(category));
    const customCategories = boardCategories
      .filter((category) => !defaultDreamCategorySet.has(category))
      .sort((left, right) => left.localeCompare(right));

    return ["all", ...builtInCategories, ...customCategories];
  }, [boardDreams]);

  useEffect(() => {
    if (activeCategory !== "all" && !categoryFilters.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, categoryFilters]);

  const filteredDreams = useMemo(() => {
    const searchValue = searchQuery.trim().toLowerCase();

    return boardDreams.filter((d) => {
      const normalizedCategory = normalizeCategory(d.category);
      const matchCategory = activeCategory === "all" || normalizedCategory === activeCategory;
      const matchSearch = !searchValue ||
        d.title.toLowerCase().includes(searchValue) ||
        d.description.toLowerCase().includes(searchValue) ||
        normalizedCategory.includes(searchValue) ||
        d.tags.some((t) => t.toLowerCase().includes(searchValue));
      return matchCategory && matchSearch;
    });
  }, [boardDreams, activeCategory, searchQuery]);

  const activeDreams = filteredDreams.filter((d) => !d.achieved);
  const achievedDreams = filteredDreams.filter((d) => d.achieved);

  const getDreamCountForBoard = useCallback((boardId: string) => dreams.filter((d) => d.boardId === boardId).length, [dreams]);

  // === Board handlers ===
  const handleCreateBoard = async (name: string, emoji: string) => {
    const created = await visionApi.createBoard(name) as any;
    const newBoard: Board = {
      id: created.id || created._id,
      name,
      emoji,
      order: boards.length,
      createdAt: created.createdAt || new Date().toISOString(),
    };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const handleRenameBoard = async (id: string, name: string, emoji: string) => {
    await visionApi.updateBoard(id, { title: name });
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name, emoji } : b)));
  };

  const handleDeleteBoard = async (id: string) => {
    await visionApi.deleteBoard(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    setDreams((prev) => prev.filter((d) => d.boardId !== id));
    if (activeBoardId === id) {
      const remaining = boards.filter((b) => b.id !== id);
      setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleShareBoard = async () => {
    if (!activeBoardId) {
      setShareStatus("Select a board first.");
      return;
    }
    if (!selectedFriendToShare) {
      setShareStatus("Select a friend to share with.");
      return;
    }

    await visionApi.shareBoard(activeBoardId, selectedFriendToShare);
    const sharedFriend = friends.find((friend) => friend.userId === selectedFriendToShare);

    if (sharedFriend) {
      setBoards((prev) =>
        prev.map((board) => {
          if (board.id !== activeBoardId) return board;
          const currentShared = Array.isArray(board.sharedWithUsers) ? board.sharedWithUsers : [];
          if (currentShared.some((member) => member.userId === sharedFriend.userId)) return board;
          return { ...board, sharedWithUsers: [...currentShared, sharedFriend] };
        })
      );
      setShareStatus(`Shared with ${sharedFriend.name}.`);
    } else {
      setShareStatus("Board shared successfully.");
    }
    setSelectedFriendToShare("");
  };

  // === Dream handlers ===
  const handleAddOrUpdateDream = async (data: Omit<Dream, "id" | "convertedToGoal" | "achieved" | "subtasks" | "createdAt" | "order">) => {
    const payload = {
      ...data,
      category: normalizeCategory(data.category),
      imageUrl: resolveMediaUrl(data.imageUrl),
    };
    if (editingDream) {
      await visionApi.updateVisionItem(editingDream.id, payload);
      setDreams((prev) => prev.map((d) => (d.id === editingDream.id ? { ...d, ...payload } : d)));
      setEditingDream(null);
    } else {
      const created = await visionApi.createVisionItem(payload) as any;
      const newDream: Dream = {
        ...payload,
        id: created.id || created._id,
        convertedToGoal: !!created.convertedToGoal,
        achieved: !!created.achieved,
        subtasks: Array.isArray(created.subtasks) ? created.subtasks : [],
        createdAt: created.createdAt || new Date().toISOString(),
        order: Number(created.order ?? boardDreams.length),
      };
      setDreams((prev) => [newDream, ...prev]);
    }
  };

  const handleDeleteDream = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDeleteDream = () => {
    if (deleteConfirm) {
      void (async () => {
        await visionApi.deleteVisionItem(deleteConfirm);
        setDreams((prev) => prev.filter((d) => d.id !== deleteConfirm));
        setDeleteConfirm(null);
        setDetailOpen(false);
      })();
    }
  };

  const handleEditDream = (dream: Dream) => {
    setEditingDream(dream);
    setDreamFormOpen(true);
  };

  const refreshDreams = async () => {
    const refreshed = await visionApi.getVisionItems(activeBoardId || undefined) as any[];
    const mappedDreams: Dream[] = refreshed.map((dream, index) => ({
      id: dream.id || dream._id,
      boardId: String(dream.boardId || dream.board),
      title: dream.title,
      description: dream.description || "",
      targetYear: Number(dream.targetYear || new Date().getFullYear() + 1),
      motivation: dream.motivation || "",
      imageUrl: dream.imageUrl || "",
        category: normalizeCategory(dream.category),
      tags: Array.isArray(dream.tags) ? dream.tags : [],
      convertedToGoal: !!dream.convertedToGoal,
      achieved: !!dream.achieved,
      achievedPhotoUrl: dream.achievedPhotoUrl,
      achievedNote: dream.achievedNote,
      subtasks: Array.isArray(dream.subtasks) ? dream.subtasks : [],
      createdAt: dream.createdAt || new Date().toISOString(),
      order: Number(dream.order ?? index),
    }));
    setDreams(mappedDreams);
    setSelectedDream((prev) => mappedDreams.find((dream) => dream.id === prev?.id) || prev);
  };

  const buildFallbackPlan = (dream?: Dream) => {
    const title = dream?.title?.trim() || "this goal";
    const tags = Array.isArray(dream?.tags) ? dream?.tags?.join(" ") : "";
    const category = dream?.category || "";
    const context = `${dream?.title || ""} ${dream?.description || ""} ${dream?.motivation || ""} ${category} ${tags}`.toLowerCase();

    const personalize = (items: string[]) => items.map((item) => item.replace("{goal}", title));

    if (/(learn|study|course|skill|language|degree|cert)/i.test(context)) {
      return personalize([
        "Define the exact {goal} outcome and level",
        "Pick the best learning path and materials",
        "Complete fundamentals and practice weekly",
        "Build a small project or real-world use case",
        "Get feedback or take an assessment",
        "Apply the skill consistently for 4 weeks",
      ]);
    }

    if (/(business|startup|company|product|app|store|shop)/i.test(context)) {
      return personalize([
        "Identify the first audience for {goal}",
        "Interview likely users about current pain points",
        "Map the core workflow users need most",
        "Build the smallest usable version of that workflow",
        "Test with first pilot users and collect feedback",
        "Improve the next version from real usage evidence",
      ]);
    }

    if (/(travel|trip|visit|vacation|tour)/i.test(context)) {
      return personalize([
        "Choose destination, dates, and trip length",
        "Set a budget and savings plan",
        "Book flights and accommodation",
        "Plan itinerary and key activities",
        "Prepare documents and logistics",
        "Go on the trip and capture highlights",
      ]);
    }

    if (/(marriage|married|wedding|engagement|fiance|fianc[ée]|spouse|relationship)/i.test(context)) {
      return personalize([
        "Align on shared values and long-term vision",
        "Discuss timelines, budget, and wedding style",
        "Choose date, venue, and key vendors",
        "Handle legal requirements and paperwork",
        "Plan ceremony details and guest list",
        "Prepare for the transition into married life",
      ]);
    }

    if (/(fitness|gym|workout|lose weight|run|marathon|health)/i.test(context)) {
      return personalize([
        "Define baseline and target metrics",
        "Create a weekly training plan",
        "Set a nutrition and recovery routine",
        "Track progress every week",
        "Increase intensity and stay consistent",
        "Review results and adjust goals",
      ]);
    }

    if (/(write|book|novel|story|blog)/i.test(context)) {
      return personalize([
        "Outline the structure and key sections",
        "Set a weekly writing schedule",
        "Draft the first version",
        "Revise and improve clarity",
        "Get feedback and finalize",
        "Publish or share the work",
      ]);
    }

    return personalize([
      "Define success criteria for {goal}",
      "Research resources and constraints",
      "Build a realistic timeline",
      "Complete the first concrete milestone",
      "Review progress and adjust the plan",
    ]);
  };

  const buildFallbackGoalPlan = (dream?: Dream): GoalPlan => {
    const title = dream?.title?.trim() || "this goal";
    const fallbackItems = buildFallbackPlan(dream);
    const phases = [
      {
        title: `Understand the real path for ${title}`,
        deadline: "First 30 days",
        milestones: fallbackItems.slice(0, 2),
        actionSteps: fallbackItems.slice(2, 4),
      },
      {
        title: "Build visible progress",
        deadline: "Next 60 days",
        milestones: fallbackItems.slice(2, 4),
        actionSteps: fallbackItems.slice(4, 6),
      },
      {
        title: "Review, improve, and continue",
        deadline: "Next 90 days",
        milestones: fallbackItems.slice(4, 6),
        actionSteps: fallbackItems.slice(0, 2),
      },
    ].filter((phase) => phase.milestones.length || phase.actionSteps.length);

    return {
      goalTitle: title,
      analysis: {
        visionSummary: `Turn "${title}" into a realistic execution roadmap.`,
        domain: formatCategoryLabel(dream?.category || "personal"),
        transformationType: "Structured goal execution",
        hiddenRequirements: ["Clear success criteria", "Weekly execution rhythm", "Feedback from relevant people"],
        requiredSkills: ["Planning", "Consistency", "Reviewing progress"],
        transformationComponents: ["Understanding", "Execution", "Feedback", "Iteration"],
        successDefinition: `Visible progress toward "${title}".`,
      },
      phases,
      successIndicators: [
        "Clear milestone list",
        "Weekly progress is trackable",
        "At least one visible proof of progress",
      ],
      personalReminder: "You do not need the perfect version before starting. You need a clear next action and consistent follow-through.",
      milestones: fallbackItems,
      source: "fallback",
    };
  };

  const normalizeGoalPlan = (data: any, dream?: Dream): GoalPlan => {
    const fallback = buildFallbackGoalPlan(dream);
    const phases = Array.isArray(data?.phases)
      ? data.phases
          .map((phase: any, index: number) => ({
            title: String(phase?.title || `Phase ${index + 1}`).trim(),
            deadline: String(phase?.deadline || "").trim(),
            milestones: Array.isArray(phase?.milestones) ? phase.milestones.map(String).filter(Boolean) : [],
            actionSteps: Array.isArray(phase?.actionSteps) ? phase.actionSteps.map(String).filter(Boolean) : [],
          }))
          .filter((phase: GoalPlanPhase) => phase.title && (phase.milestones.length || phase.actionSteps.length))
      : [];

    if (phases.length > 0) {
      return {
        ...fallback,
        ...data,
        phases,
        successIndicators: Array.isArray(data?.successIndicators) ? data.successIndicators.map(String).filter(Boolean) : fallback.successIndicators,
        personalReminder: data?.personalReminder || fallback.personalReminder,
      };
    }

    const flatMilestones = Array.isArray(data?.milestones) ? data.milestones.map(String).filter(Boolean) : [];
    if (flatMilestones.length === 0) return fallback;

    return {
      ...fallback,
      source: data?.source || fallback.source,
      milestones: flatMilestones,
      phases: [
        {
          title: "Phase 1 - Build the execution base",
          deadline: "First 30 days",
          milestones: flatMilestones.slice(0, 3),
          actionSteps: flatMilestones.slice(3, 6),
        },
        {
          title: "Phase 2 - Turn progress into proof",
          deadline: "Next 60 days",
          milestones: flatMilestones.slice(3, 6),
          actionSteps: flatMilestones.slice(6, 10),
        },
      ].filter((phase) => phase.milestones.length || phase.actionSteps.length),
    };
  };

  const flattenPlanSubtasks = (plan: GoalPlan | null) =>
    (plan?.phases || []).flatMap((phase) => [
      ...phase.milestones.map((title) => ({
        title: title.trim(),
        phaseTitle: phase.title,
        kind: "milestone",
        done: false,
      })),
      ...phase.actionSteps.map((title) => ({
        title: title.trim(),
        phaseTitle: phase.title,
        kind: "action",
        done: false,
      })),
    ]).filter((item) => item.title);

  const updatePlanPhaseField = (phaseIndex: number, field: keyof Pick<GoalPlanPhase, "title" | "deadline">, value: string) => {
    setGoalPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase, index) => (index === phaseIndex ? { ...phase, [field]: value } : phase)),
      };
    });
  };

  const updatePlanListItem = (phaseIndex: number, field: "milestones" | "actionSteps", itemIndex: number, value: string) => {
    setGoalPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase, index) =>
          index === phaseIndex
            ? { ...phase, [field]: phase[field].map((item, i) => (i === itemIndex ? value : item)) }
            : phase
        ),
      };
    });
  };

  const removePlanListItem = (phaseIndex: number, field: "milestones" | "actionSteps", itemIndex: number) => {
    setGoalPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase, index) =>
          index === phaseIndex ? { ...phase, [field]: phase[field].filter((_, i) => i !== itemIndex) } : phase
        ),
      };
    });
  };

  const addPlanListItem = (phaseIndex: number, field: "milestones" | "actionSteps") => {
    setGoalPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase, index) =>
          index === phaseIndex ? { ...phase, [field]: [...phase[field], ""] } : phase
        ),
      };
    });
  };

  const regeneratePlanPhase = async (phaseIndex: number) => {
    if (!planDreamId || !goalPlan) return;
    const dream = dreams.find((d) => d.id === planDreamId);
    setRegeneratingPhaseIndex(phaseIndex);
    try {
      const data = await visionApi.getGoalPlan(planDreamId) as GoalPlan;
      const refreshed = normalizeGoalPlan(data, dream);
      const replacement = refreshed.phases[phaseIndex] || refreshed.phases[0];
      if (!replacement) return;
      setGoalPlan((prev) => {
        if (!prev) return refreshed;
        return {
          ...prev,
          phases: prev.phases.map((phase, index) => (index === phaseIndex ? replacement : phase)),
        };
      });
    } catch {
      setPlanError("Could not regenerate that phase. You can still edit it manually.");
    } finally {
      setRegeneratingPhaseIndex(null);
    }
  };

  const handleConvertToGoal = async (id: string) => {
    setPlanDreamId(id);
    setPlanDialogOpen(true);
    setPlanLoading(true);
    setPlanError("");
    setGoalPlan(null);
    const dream = dreams.find((d) => d.id === id);
    try {
      const data = await visionApi.getGoalPlan(id) as GoalPlan;
      const nextPlan = normalizeGoalPlan(data, dream);
      setGoalPlan(nextPlan);
      if (data?.source === "fallback") {
        setPlanError("AI plan unavailable. Using a domain-aware local roadmap.");
      }
    } catch {
      setGoalPlan(buildFallbackGoalPlan(dream));
      setPlanError("AI plan unavailable. Using a domain-aware local roadmap.");
    } finally {
      setPlanLoading(false);
    }
  };

  const applyPlanAndConvert = async () => {
    if (!planDreamId || !goalPlan) return;
    const subtasks = flattenPlanSubtasks(goalPlan);
    await visionApi.convertToGoal(planDreamId, { subtasks, roadmap: goalPlan });
    await refreshDreams();
    setPlanDialogOpen(false);
    setDetailOpen(false);
  };

  const handleMarkAchieved = async (id: string, photoUrl?: string, note?: string) => {
    await visionApi.updateVisionItem(id, {
      achieved: true,
      achievedPhotoUrl: photoUrl,
      achievedNote: note || "",
    });
    setDreams((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, achieved: true, achievedPhotoUrl: photoUrl || d.achievedPhotoUrl, achievedNote: note || "" } : d
      )
    );
  };

  const handleUpdateDreamImage = async (id: string, imageUrl: string) => {
    const resolved = resolveMediaUrl(imageUrl);
    await visionApi.updateVisionItem(id, { imageUrl: resolved });
    setDreams((prev) => prev.map((d) => (d.id === id ? { ...d, imageUrl: resolved } : d)));
    setSelectedDream((prev) => (prev && prev.id === id ? { ...prev, imageUrl: resolved } : prev));
  };

  const handleToggleSubtask = async (dreamId: string, subtaskId: string) => {
    const current = dreams.find((d) => d.id === dreamId);
    if (!current) return;
    const subtasks = current.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    await visionApi.updateVisionItem(dreamId, { subtasks });
    setDreams((prev) =>
      prev.map((d) => (d.id === dreamId ? { ...d, subtasks } : d))
    );
    setSelectedDream((prev) => (prev && prev.id === dreamId ? { ...prev, subtasks } : prev));
  };

  const openDreamDetail = (dream: Dream) => {
    setSelectedDream(dream);
    setDetailOpen(true);
  };

  const openAddDream = () => {
    setEditingDream(null);
    setDreamFormOpen(true);
  };

  const hasBoards = boards.length > 0;
  const hasDreamsInBoard = boardDreams.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      <FloatingParticles />

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Vision Board</h1>
          <p className="text-muted-foreground mt-1 font-handwritten text-lg">Dare to dream, then make it real ✦</p>
        </div>
        <div className="flex items-center gap-2">
          {hasBoards && activeBoard?.isOwner && (
            <Button onClick={() => { setShareStatus(""); setShareDialogOpen(true); }} variant="outline" className="rounded-xl">
              <Share2 className="mr-2 h-4 w-4" /> Share Board
            </Button>
          )}
          {hasBoards && (
            <Button onClick={openAddDream} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 shadow-glow-teal" disabled={!activeBoardId}>
              <Plus className="mr-2 h-4 w-4" /> New Dream
            </Button>
          )}
          <Button onClick={() => setCreateBoardOpen(true)} variant={hasBoards ? "outline" : "default"} className="rounded-xl">
            <FolderPlus className="mr-2 h-4 w-4" /> New Board
          </Button>
        </div>
      </motion.div>

      {/* No boards → empty state */}
      {!hasBoards && <EmptyBoardState onAdd={() => setCreateBoardOpen(true)} />}

      {/* Board tabs */}
      {hasBoards && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          {boards.length >= 4 && (
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search boards..."
                value={boardSearchQuery}
                onChange={(e) => setBoardSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-9 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <AnimatePresence mode="popLayout">
              {filteredBoards.map((board) => (
                <BoardTab
                  key={board.id}
                  board={board}
                  isActive={board.id === activeBoardId}
                  onClick={() => { setActiveBoardId(board.id); setActiveCategory("all"); setSearchQuery(""); }}
                  onEdit={() => { setEditBoard(board); setRenameBoardOpen(true); }}
                  onDelete={() => handleDeleteBoard(board.id)}
                  dreamCount={getDreamCountForBoard(board.id)}
                />
              ))}
            </AnimatePresence>
            <button
              onClick={() => setCreateBoardOpen(true)}
              className="shrink-0 w-9 h-9 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Active board content */}
      {hasBoards && activeBoardId && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBoardId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            {/* Board header with stats */}
            {activeBoard && (
              <div className="surface-scrapbook rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeBoard.emoji}</span>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">{activeBoard.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {boardDreams.length} dream{boardDreams.length !== 1 ? "s" : ""} · {boardDreams.filter((d) => d.achieved).length} achieved
                      </p>
                      {activeBoardSharedWithLabel && (
                        <p className="mt-2 text-xs text-primary font-medium">
                          {activeBoardSharedWithLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {boardDreams.length > 0 && (
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-teal">{boardDreams.filter((d) => d.convertedToGoal).length}</p>
                            <p className="text-[10px] text-muted-foreground">Goals</p>
                          </div>
                          <div className="w-px h-8 bg-border" />
                          <div className="text-center">
                            <p className="text-lg font-bold text-golden">{boardDreams.filter((d) => d.achieved).length}</p>
                            <p className="text-[10px] text-muted-foreground">Achieved</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dream search + category filter */}
            {hasDreamsInBoard && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search dreams, categories, or tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categoryFilters.map((c) => (
                    <Badge
                      key={c}
                      variant={c === activeCategory ? "default" : "secondary"}
                      className="cursor-pointer capitalize px-3 py-1 rounded-full transition-all hover:scale-105"
                      onClick={() => setActiveCategory(c)}
                    >
                      {c !== "all" && getCategoryEmoji(c)} {c === "all" ? "all" : formatCategoryLabel(c)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Empty dream state for this board */}
            {!hasDreamsInBoard && <EmptyDreamState onAdd={openAddDream} />}

            {/* Current dreams */}
            {hasDreamsInBoard && (
              <div>
                <SectionHeader
                  icon={Sparkles}
                  title="Current Dreams"
                  subtitle="Dreams waiting to become reality"
                  count={activeDreams.length}
                  expanded={dreamsExpanded}
                  onToggle={() => setDreamsExpanded(!dreamsExpanded)}
                />
                <AnimatePresence>
                  {dreamsExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      {activeDreams.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center font-handwritten text-base">
                          {searchQuery || activeCategory !== "all" ? "No dreams match your filters ✦" : "No active dreams — add one above ✦"}
                        </p>
                      ) : (
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 pt-2">
                          <AnimatePresence>
                            {activeDreams.map((dream, i) => (
                              <DreamCard key={dream.id} dream={dream} index={i} onExpand={openDreamDetail} onEdit={handleEditDream} onDelete={handleDeleteDream} />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Achieved dreams */}
            {achievedDreams.length > 0 && (
              <div>
                <SectionHeader
                  icon={Trophy}
                  title="Achieved Dreams"
                  subtitle="Dreams that became your reality"
                  count={achievedDreams.length}
                  expanded={achievedExpanded}
                  onToggle={() => setAchievedExpanded(!achievedExpanded)}
                />
                <AnimatePresence>
                  {achievedExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 pt-2">
                        <AnimatePresence>
                          {achievedDreams.map((dream, i) => (
                            <DreamCard key={dream.id} dream={dream} index={i} onExpand={openDreamDetail} onEdit={handleEditDream} onDelete={handleDeleteDream} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Dialogs */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md surface-scrapbook">
          <DialogHeader>
            <DialogTitle className="font-display">Share This Board</DialogTitle>
            <DialogDescription>
              Share "{activeBoard?.name || "this board"}" with an accepted friend so they can add and edit vision items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select value={selectedFriendToShare} onValueChange={setSelectedFriendToShare}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a friend" />
              </SelectTrigger>
              <SelectContent>
                {friends.map((friend) => (
                  <SelectItem key={friend.userId} value={friend.userId}>{friend.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {shareStatus && <p className="text-xs text-muted-foreground">{shareStatus}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => void handleShareBoard()} className="rounded-xl">Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateBoardDialog open={createBoardOpen} onClose={() => setCreateBoardOpen(false)} onAdd={handleCreateBoard} />
      <RenameBoardDialog open={renameBoardOpen} onClose={() => setRenameBoardOpen(false)} board={editBoard} onRename={handleRenameBoard} />
      {activeBoardId && (
        <DreamFormDialog
          open={dreamFormOpen}
          onClose={() => { setDreamFormOpen(false); setEditingDream(null); }}
          onSubmit={handleAddOrUpdateDream}
          boardId={activeBoardId}
          editDream={editingDream}
          uploadImageFile={uploadVisionImage}
          onStartCrop={(file, onDone) => handleStartCrop(file, onDone)}
        />
      )}
      <DreamDetailDialog
        dream={selectedDream}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onConvertToGoal={handleConvertToGoal}
        onMarkAchieved={handleMarkAchieved}
        onToggleSubtask={handleToggleSubtask}
        onUpdateImage={handleUpdateDreamImage}
        onEdit={handleEditDream}
        onDelete={handleDeleteDream}
        uploadImageFile={uploadVisionImage}
        onStartCrop={(file, onDone) => handleStartCrop(file, onDone)}
      />
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Crop Image</DialogTitle>
            <DialogDescription>Adjust crop, zoom, and rotation, then apply.</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-80 bg-muted/40 rounded-lg overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zoom</label>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rotation</label>
              <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleApplyCrop()} className="gradient-primary text-primary-foreground">Apply Crop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">AI Goal Roadmap</DialogTitle>
            <DialogDescription>
              Review the analysis, phases, milestones, and action steps before converting this vision into a goal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {planError && <p className="text-xs text-muted-foreground">{planError}</p>}
            {planLoading && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{AI_THINKING_STATES[thinkingIndex]}</p>
                    <p className="text-xs text-muted-foreground">The roadmap engine is analyzing the dream before writing milestones.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {AI_THINKING_STATES.map((state, index) => (
                    <div
                      key={state}
                      className={`h-1.5 rounded-full ${index <= thinkingIndex ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!planLoading && goalPlan && (
              <>
                {goalPlan.analysis && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Dream analysis</p>
                      <p className="text-sm text-foreground mt-1">{goalPlan.analysis.visionSummary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {goalPlan.analysis.domain && <Badge variant="secondary">{goalPlan.analysis.domain}</Badge>}
                      {goalPlan.analysis.transformationType && <Badge variant="outline">{goalPlan.analysis.transformationType}</Badge>}
                    </div>
                    {Array.isArray(goalPlan.analysis.requiredSkills) && goalPlan.analysis.requiredSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Detected skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {goalPlan.analysis.requiredSkills.map((skill) => (
                            <span key={skill} className="text-xs rounded-full bg-background border border-border/60 px-2 py-1">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {goalPlan.phases.map((phase, phaseIndex) => (
                    <div key={`${phaseIndex}-${phase.title}`} className="rounded-xl border border-border/60 p-4 space-y-4 bg-card">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="secondary" className="rounded-full">Phase {phaseIndex + 1}</Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={regeneratingPhaseIndex === phaseIndex}
                          onClick={() => void regeneratePlanPhase(phaseIndex)}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          {regeneratingPhaseIndex === phaseIndex ? "Regenerating..." : "Regenerate phase"}
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                        <Input
                          value={phase.title}
                          onChange={(e) => updatePlanPhaseField(phaseIndex, "title", e.target.value)}
                          placeholder={`Phase ${phaseIndex + 1} title`}
                          className="font-semibold"
                        />
                        <Input
                          value={phase.deadline}
                          onChange={(e) => updatePlanPhaseField(phaseIndex, "deadline", e.target.value)}
                          placeholder="Deadline"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
                          {phase.milestones.map((item, itemIndex) => (
                            <div key={`m-${phaseIndex}-${itemIndex}`} className="flex items-center gap-2">
                              <Input
                                value={item}
                                onChange={(e) => updatePlanListItem(phaseIndex, "milestones", itemIndex, e.target.value)}
                                placeholder={`Milestone ${itemIndex + 1}`}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePlanListItem(phaseIndex, "milestones", itemIndex)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addPlanListItem(phaseIndex, "milestones")} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add milestone
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action steps</p>
                          {phase.actionSteps.map((item, itemIndex) => (
                            <div key={`a-${phaseIndex}-${itemIndex}`} className="flex items-center gap-2">
                              <Input
                                value={item}
                                onChange={(e) => updatePlanListItem(phaseIndex, "actionSteps", itemIndex, e.target.value)}
                                placeholder={`Action step ${itemIndex + 1}`}
                              />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removePlanListItem(phaseIndex, "actionSteps", itemIndex)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => addPlanListItem(phaseIndex, "actionSteps")} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add action
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {Array.isArray(goalPlan.successIndicators) && goalPlan.successIndicators.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Success indicators</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {goalPlan.successIndicators.map((indicator) => (
                        <div key={indicator} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{indicator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {goalPlan.personalReminder && (
                  <p className="rounded-xl border border-golden/30 bg-golden/10 p-4 text-sm text-foreground">
                    {goalPlan.personalReminder}
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} disabled={planLoading || regeneratingPhaseIndex !== null}>Cancel</Button>
            <Button
              onClick={() => void applyPlanAndConvert()}
              disabled={planLoading || regeneratingPhaseIndex !== null || !goalPlan || flattenPlanSubtasks(goalPlan).length === 0}
              className="gradient-primary text-primary-foreground"
            >
              {planLoading ? AI_THINKING_STATES[thinkingIndex] : "Approve & Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="surface-scrapbook">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this dream?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Your dream will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDream} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VisionBoard;
