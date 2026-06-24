import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LifeBookSetupProps {
  open: boolean;
  onClose: () => void;
  onCreateBook: (title: string, authorName: string) => void;
}

const LifeBookSetup = ({ open, onClose, onCreateBook }: LifeBookSetupProps) => {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateBook(title.trim(), authorName.trim() || "Anonymous");
    setTitle("");
    setAuthorName("");
    onClose();
  };

  const suggestions = [
    "My Journey So Far",
    "The Story of My Life",
    "From Struggles to Strength",
    "Chapters of Me",
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-border/40">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Create Your Life Book
          </DialogTitle>
          <DialogDescription>
            Give your story a title. This will appear on your 3D book cover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Book Title
            </label>
            <Input
              placeholder="e.g. My Journey So Far"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display text-lg"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setTitle(s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Author Name
            </label>
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>

          <motion.div
            className="surface-card p-4 gradient-warm rounded-xl text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="h-5 w-5 text-amber mx-auto mb-2" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your Life Book is a guided journey through 7 chapters — from
              beginnings to dreams. Each chapter asks reflection questions that
              become pages in your 3D book.
            </p>
          </motion.div>

          <Button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full gradient-primary text-primary-foreground rounded-xl shadow-depth"
          >
            <PenLine className="mr-2 h-4 w-4" /> Begin My Story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LifeBookSetup;
