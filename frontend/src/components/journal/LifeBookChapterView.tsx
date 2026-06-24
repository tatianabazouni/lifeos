import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LifeBook, LifeBookPrompt } from "./lifeBookTypes";

interface LifeBookChapterViewProps {
  book: LifeBook;
  onUpdatePrompt: (chapterId: string, promptId: string, response: string) => void;
  onViewBook: () => void;
}

const LifeBookChapterView = ({
  book,
  onUpdatePrompt,
  onViewBook,
}: LifeBookChapterViewProps) => {
  const [activeChapter, setActiveChapter] = useState(0);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const chapter = book.chapters[activeChapter];
  const totalWritten = book.chapters.reduce(
    (sum, ch) => sum + ch.prompts.filter((p) => p.response.trim()).length,
    0
  );
  const totalPrompts = book.chapters.reduce(
    (sum, ch) => sum + ch.prompts.length,
    0
  );

  const startWriting = (prompt: LifeBookPrompt) => {
    setActivePrompt(prompt.id);
    setDraftText(prompt.response);
  };

  const savePrompt = () => {
    if (!activePrompt) return;
    onUpdatePrompt(chapter.id, activePrompt, draftText);
    setActivePrompt(null);
    setDraftText("");
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">
            Your story progress
          </p>
          <p className="text-sm font-medium">
            {totalWritten} / {totalPrompts} reflections
          </p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(155 45% 43%), hsl(228 67% 41%))",
            }}
            initial={{ width: 0 }}
            animate={{
              width: `${totalPrompts > 0 ? (totalWritten / totalPrompts) * 100 : 0}%`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Chapter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {book.chapters.map((ch, i) => {
          const written = ch.prompts.filter((p) => p.response.trim()).length;
          const isActive = i === activeChapter;
          return (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChapter(i);
                setActivePrompt(null);
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-depth font-medium"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <span>{ch.icon}</span>
              <span className="whitespace-nowrap">{ch.title}</span>
              {written === ch.prompts.length && ch.prompts.length > 0 && (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active chapter */}
      <AnimatePresence mode="wait">
        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Chapter header */}
          <div className="surface-scrapbook p-6">
            <div className="tape-effect" />
            <div className="flex items-start gap-4 pt-2">
              <span className="text-4xl">{chapter.icon}</span>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Chapter {activeChapter + 1}
                </p>
                <h2 className="font-display text-2xl font-bold">
                  {chapter.title}
                </h2>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  {chapter.description}
                </p>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div className="grid gap-3">
            {chapter.prompts.map((prompt) => {
              const isWriting = activePrompt === prompt.id;
              const hasResponse = prompt.response.trim().length > 0;

              return (
                <motion.div
                  key={prompt.id}
                  layout
                  className={`surface-card p-5 transition-all ${
                    isWriting ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  <p className="font-display text-lg font-semibold mb-2 leading-snug">
                    "{prompt.question}"
                  </p>

                  {isWriting ? (
                    <div className="space-y-3 mt-3">
                      <div className="surface-notebook rounded-xl p-3">
                        <Textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          placeholder="Write your reflection…"
                          className="min-h-[140px] border-0 resize-none focus-visible:ring-0 bg-transparent text-base leading-8"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActivePrompt(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={savePrompt}
                          disabled={!draftText.trim()}
                          className="gradient-primary text-primary-foreground rounded-xl"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : hasResponse ? (
                    <div className="mt-2">
                      <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {prompt.response}
                      </p>
                      <button
                        onClick={() => startWriting(prompt)}
                        className="text-xs text-primary mt-2 hover:underline"
                      >
                        Edit reflection
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-xl"
                      onClick={() => startWriting(prompt)}
                    >
                      <PenLine className="mr-1.5 h-3.5 w-3.5" /> Write your
                      reflection
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Chapter navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              disabled={activeChapter === 0}
              onClick={() => {
                setActiveChapter((p) => p - 1);
                setActivePrompt(null);
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous Chapter
            </Button>

            {activeChapter === book.chapters.length - 1 ? (
              <Button
                onClick={onViewBook}
                className="gradient-primary text-primary-foreground rounded-xl shadow-depth"
              >
                <BookOpen className="mr-2 h-4 w-4" /> View My Life Book
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveChapter((p) => p + 1);
                  setActivePrompt(null);
                }}
              >
                Next Chapter <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LifeBookChapterView;
