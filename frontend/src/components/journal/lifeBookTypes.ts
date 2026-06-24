/** Life Book types — guided storytelling journal */

export interface LifeBook {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
  chapters: LifeBookChapter[];
}

export interface LifeBookChapter {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompts: LifeBookPrompt[];
}

export interface LifeBookPrompt {
  id: string;
  chapterId: string;
  question: string;
  response: string; // user-written text — empty until filled
  writtenAt?: string;
}

export interface LifeBookReflection {
  chapterId: string;
  chapterTitle: string;
  prompt: string;
  response: string;
  writtenAt: string;
}

/** Default chapter templates (prompts start empty — user fills them) */
export const DEFAULT_CHAPTERS: Omit<LifeBookChapter, "id">[] = [
  {
    title: "Beginnings",
    description: "Where your story starts — your earliest memories and the world you were born into.",
    icon: "🌱",
    prompts: [],
  },
  {
    title: "Childhood Memories",
    description: "The moments, people, and places that shaped your early years.",
    icon: "🧸",
    prompts: [],
  },
  {
    title: "Challenges & Difficult Moments",
    description: "The struggles that tested you and forged your resilience.",
    icon: "⛰️",
    prompts: [],
  },
  {
    title: "Turning Points",
    description: "Pivotal moments that changed the direction of your life.",
    icon: "🔄",
    prompts: [],
  },
  {
    title: "Achievements & Proud Moments",
    description: "Victories — big and small — that you earned through effort.",
    icon: "🏆",
    prompts: [],
  },
  {
    title: "Lessons Learned",
    description: "Wisdom gathered from experience, mistakes, and growth.",
    icon: "📖",
    prompts: [],
  },
  {
    title: "Dreams for the Future",
    description: "Where your story goes next — hopes, goals, and visions.",
    icon: "✨",
    prompts: [],
  },
];

/** Prompt templates per chapter index */
export const CHAPTER_PROMPTS: string[][] = [
  // Beginnings
  [
    "What is your earliest memory?",
    "Describe the home or place where you grew up.",
    "Who were the first important people in your life?",
    "What is a story your family tells about you as a child?",
  ],
  // Childhood Memories
  [
    "What was your favorite game or activity as a child?",
    "Describe a place that felt magical to you.",
    "Who was your best friend growing up?",
    "What smell, sound, or taste brings you back to childhood?",
  ],
  // Challenges
  [
    "Describe a difficult moment that changed you.",
    "What is one challenge you overcame that you're proud of?",
    "When did you feel most lost, and how did you find your way?",
    "What did failure teach you?",
  ],
  // Turning Points
  [
    "What decision changed the course of your life?",
    "Was there a moment you realized you had grown?",
    "Describe a person who appeared at exactly the right time.",
    "What moment shaped who you are today?",
  ],
  // Achievements
  [
    "What achievement are you most proud of?",
    "Describe a goal you worked hard to reach.",
    "When did you surprise yourself with what you could do?",
    "What accomplishment would you want others to know about?",
  ],
  // Lessons
  [
    "What is the most important lesson life taught you?",
    "What advice would you give your younger self?",
    "What mistake turned into your greatest teacher?",
    "What do you know now that you wish you knew earlier?",
  ],
  // Dreams
  [
    "What does your ideal future look like?",
    "What dream have you not yet pursued?",
    "If you could write the next chapter of your life, what would happen?",
    "What legacy do you want to leave behind?",
  ],
];

/** Create a fresh LifeBook with default chapters and prompts */
export function createLifeBook(title: string, authorName: string): LifeBook {
  const chapters: LifeBookChapter[] = DEFAULT_CHAPTERS.map((ch, ci) => {
    const chapterId = `ch-${ci}-${Date.now()}`;
    return {
      ...ch,
      id: chapterId,
      prompts: (Array.isArray(CHAPTER_PROMPTS[ci]) ? CHAPTER_PROMPTS[ci] : []).map((q, qi) => ({
        id: `p-${ci}-${qi}-${Date.now()}`,
        chapterId,
        question: q,
        response: "",
      })),
    };
  });

  return {
    id: `lb-${Date.now()}`,
    title,
    authorName,
    createdAt: new Date().toISOString(),
    chapters,
  };
}

/** Extract all written reflections (non-empty) for the 3D book */
export function getBookReflections(book: LifeBook): LifeBookReflection[] {
  const reflections: LifeBookReflection[] = [];
  for (const ch of book.chapters) {
    for (const p of ch.prompts) {
      if (p.response.trim()) {
        reflections.push({
          chapterId: ch.id,
          chapterTitle: ch.title,
          prompt: p.question,
          response: p.response,
          writtenAt: p.writtenAt || book.createdAt,
        });
      }
    }
  }
  return reflections;
}
