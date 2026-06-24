/** Life Story System — structured psychological transformation journal */

export type LifeStorySection =
  | "identity"
  | "past"
  | "emotions"
  | "purpose"
  | "patterns"
  | "growth";

export type EntryType =
  | "lifebook"
  | "freewrite"
  | "guided"
  | "reflection";

export interface DepthLevel {
  level: number;
  label: string;
  question: string;
}

export interface LifeStoryPrompt {
  id: string;
  section: LifeStorySection;
  question: string;
  depthLevels: DepthLevel[];
  emotionTag?: string;
  isDialogue?: boolean; // inner dialogue mode (Mind vs Heart)
}

export interface LifeStoryEntry {
  id: string;
  type: EntryType;
  section?: LifeStorySection;
  promptId?: string;
  title: string;
  content: string;
  heartContent?: string; // for inner dialogue mode
  mood: string;
  depthLevel: number;
  createdAt: string;
  wordCount: number;
}

export interface SectionMeta {
  key: LifeStorySection;
  title: string;
  subtitle: string;
  icon: string;
  color: string; // CSS variable name
  description: string;
}

export const SECTIONS: SectionMeta[] = [
  {
    key: "identity",
    title: "Identity",
    subtitle: "Who I Am",
    icon: "🪞",
    color: "primary",
    description:
      "Explore your core self — your values, beliefs, and the essence of who you are beneath the surface.",
  },
  {
    key: "past",
    title: "Past",
    subtitle: "My Story",
    icon: "📜",
    color: "amber",
    description:
      "Revisit your history with compassion. Understand the moments that shaped who you've become.",
  },
  {
    key: "emotions",
    title: "Emotions",
    subtitle: "Inner World",
    icon: "🌊",
    color: "secondary",
    description:
      "Dive into your emotional landscape. Name, understand, and process what you feel.",
  },
  {
    key: "purpose",
    title: "Purpose",
    subtitle: "Future & Dreams",
    icon: "✨",
    color: "golden",
    description:
      "Envision the life you want. Clarify your purpose and the legacy you wish to create.",
  },
  {
    key: "patterns",
    title: "Patterns",
    subtitle: "Behavior Awareness",
    icon: "🔁",
    color: "accent",
    description:
      "Recognize your recurring patterns — the habits, reactions, and cycles that drive your life.",
  },
  {
    key: "growth",
    title: "Growth",
    subtitle: "Evolution",
    icon: "🌱",
    color: "growth",
    description:
      "Track your transformation. Celebrate progress and set intentions for continued evolution.",
  },
];

export const SECTION_PROMPTS: Record<LifeStorySection, LifeStoryPrompt[]> = {
  identity: [
    {
      id: "id-1",
      section: "identity",
      question: "How would you describe yourself in three words?",
      depthLevels: [
        { level: 1, label: "Surface", question: "What three words come to mind first?" },
        { level: 2, label: "Deeper", question: "Why did you choose those words? What experiences shaped them?" },
        { level: 3, label: "Core", question: "If those labels were stripped away, who would remain?" },
      ],
    },
    {
      id: "id-2",
      section: "identity",
      question: "What do you value most in life?",
      depthLevels: [
        { level: 1, label: "Surface", question: "List the values that feel most important to you." },
        { level: 2, label: "Deeper", question: "When did you first realize these values mattered?" },
        { level: 3, label: "Core", question: "How do your daily actions align (or conflict) with these values?" },
      ],
    },
    {
      id: "id-3",
      section: "identity",
      question: "What roles do you play in your life?",
      depthLevels: [
        { level: 1, label: "Surface", question: "List the roles you hold — parent, friend, professional, etc." },
        { level: 2, label: "Deeper", question: "Which role feels most authentically 'you'?" },
        { level: 3, label: "Core", question: "What would happen if you stopped performing a role that doesn't serve you?" },
      ],
    },
    {
      id: "id-4",
      section: "identity",
      question: "What is the story you tell yourself about yourself?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Write your self-narrative in a few sentences." },
        { level: 2, label: "Deeper", question: "Where did this narrative come from? Who wrote it?" },
        { level: 3, label: "Core", question: "If you could rewrite your story, what would change?" },
      ],
      isDialogue: true,
    },
  ],
  past: [
    {
      id: "pa-1",
      section: "past",
      question: "What is your earliest meaningful memory?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe the memory — sights, sounds, feelings." },
        { level: 2, label: "Deeper", question: "Why has this memory stayed with you?" },
        { level: 3, label: "Core", question: "How does this memory still influence you today?" },
      ],
    },
    {
      id: "pa-2",
      section: "past",
      question: "What moment changed the course of your life?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe what happened." },
        { level: 2, label: "Deeper", question: "What did you lose or gain from this moment?" },
        { level: 3, label: "Core", question: "Who would you be if this had never happened?" },
      ],
    },
    {
      id: "pa-3",
      section: "past",
      question: "What hurt you most — and have you healed?",
      emotionTag: "pain",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name the wound without judgment." },
        { level: 2, label: "Deeper", question: "How has this pain shaped your behavior or beliefs?" },
        { level: 3, label: "Core", question: "What would forgiveness — of yourself or others — look like?" },
      ],
    },
    {
      id: "pa-4",
      section: "past",
      question: "What lesson did your childhood teach you?",
      depthLevels: [
        { level: 1, label: "Surface", question: "What was the main lesson you absorbed growing up?" },
        { level: 2, label: "Deeper", question: "Is this lesson still serving you, or holding you back?" },
        { level: 3, label: "Core", question: "What would you tell your younger self about this lesson?" },
      ],
      isDialogue: true,
    },
  ],
  emotions: [
    {
      id: "em-1",
      section: "emotions",
      question: "What emotion do you feel right now?",
      emotionTag: "present",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name the feeling and where you feel it in your body." },
        { level: 2, label: "Deeper", question: "What triggered this feeling? What's beneath it?" },
        { level: 3, label: "Core", question: "What is this emotion trying to tell you?" },
      ],
    },
    {
      id: "em-2",
      section: "emotions",
      question: "What emotion do you avoid most?",
      emotionTag: "avoidance",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name the emotion you push away." },
        { level: 2, label: "Deeper", question: "What happens when you allow this emotion to exist?" },
        { level: 3, label: "Core", question: "What are you protecting yourself from by avoiding this feeling?" },
      ],
    },
    {
      id: "em-3",
      section: "emotions",
      question: "When did you last cry — and why?",
      emotionTag: "vulnerability",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe the moment." },
        { level: 2, label: "Deeper", question: "Was it a release, or a breaking point?" },
        { level: 3, label: "Core", question: "What does crying mean to you — weakness or strength?" },
      ],
      isDialogue: true,
    },
    {
      id: "em-4",
      section: "emotions",
      question: "What brings you genuine peace?",
      emotionTag: "peace",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe a moment of true peace." },
        { level: 2, label: "Deeper", question: "Why is this feeling rare for you?" },
        { level: 3, label: "Core", question: "What would your life look like if you prioritized this peace?" },
      ],
    },
  ],
  purpose: [
    {
      id: "pu-1",
      section: "purpose",
      question: "What would you do if you knew you couldn't fail?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe your fearless dream." },
        { level: 2, label: "Deeper", question: "What stops you from pursuing this?" },
        { level: 3, label: "Core", question: "What if the journey matters more than success?" },
      ],
    },
    {
      id: "pu-2",
      section: "purpose",
      question: "What legacy do you want to leave?",
      depthLevels: [
        { level: 1, label: "Surface", question: "How do you want to be remembered?" },
        { level: 2, label: "Deeper", question: "Are you living in alignment with that vision?" },
        { level: 3, label: "Core", question: "What one thing could you start today that serves that legacy?" },
      ],
    },
    {
      id: "pu-3",
      section: "purpose",
      question: "What gives your life meaning?",
      depthLevels: [
        { level: 1, label: "Surface", question: "What activities or relationships bring you meaning?" },
        { level: 2, label: "Deeper", question: "Has what gives you meaning changed over time?" },
        { level: 3, label: "Core", question: "If meaning disappeared tomorrow, what would you chase?" },
      ],
    },
    {
      id: "pu-4",
      section: "purpose",
      question: "Write a letter to your future self.",
      depthLevels: [
        { level: 1, label: "Surface", question: "What do you hope your future self has achieved?" },
        { level: 2, label: "Deeper", question: "What fears are you carrying that you hope are gone?" },
        { level: 3, label: "Core", question: "What truth do you need your future self to remember?" },
      ],
    },
  ],
  patterns: [
    {
      id: "pt-1",
      section: "patterns",
      question: "What behavior do you keep repeating that doesn't serve you?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name the pattern honestly." },
        { level: 2, label: "Deeper", question: "What need is this pattern trying to meet?" },
        { level: 3, label: "Core", question: "What would a healthier way to meet this need look like?" },
      ],
    },
    {
      id: "pt-2",
      section: "patterns",
      question: "How do you respond to conflict?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe your typical response — fight, flight, freeze?" },
        { level: 2, label: "Deeper", question: "Where did you learn this response?" },
        { level: 3, label: "Core", question: "What would a conscious, chosen response look like instead?" },
      ],
      isDialogue: true,
    },
    {
      id: "pt-3",
      section: "patterns",
      question: "What stories do you tell yourself when things go wrong?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Write down the narrative that plays in your head." },
        { level: 2, label: "Deeper", question: "Is this story factual, or a distortion?" },
        { level: 3, label: "Core", question: "What evidence contradicts this story?" },
      ],
    },
    {
      id: "pt-4",
      section: "patterns",
      question: "What triggers you most — and why?",
      emotionTag: "trigger",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name a specific trigger and your reaction." },
        { level: 2, label: "Deeper", question: "What old wound does this trigger activate?" },
        { level: 3, label: "Core", question: "How can you create space between trigger and response?" },
      ],
    },
  ],
  growth: [
    {
      id: "gr-1",
      section: "growth",
      question: "How have you changed in the last year?",
      depthLevels: [
        { level: 1, label: "Surface", question: "What's different about you compared to a year ago?" },
        { level: 2, label: "Deeper", question: "What catalyzed this change?" },
        { level: 3, label: "Core", question: "What growth are you most proud of — and most afraid of?" },
      ],
    },
    {
      id: "gr-2",
      section: "growth",
      question: "What is one belief you've outgrown?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Name the old belief." },
        { level: 2, label: "Deeper", question: "What replaced it, and when did the shift happen?" },
        { level: 3, label: "Core", question: "What beliefs might you be outgrowing right now without realizing it?" },
      ],
    },
    {
      id: "gr-3",
      section: "growth",
      question: "What does your ideal self look like?",
      depthLevels: [
        { level: 1, label: "Surface", question: "Describe the person you're becoming." },
        { level: 2, label: "Deeper", question: "What gaps exist between who you are and who you want to be?" },
        { level: 3, label: "Core", question: "What if you're already closer than you think?" },
      ],
    },
    {
      id: "gr-4",
      section: "growth",
      question: "Write a gratitude letter to yourself.",
      depthLevels: [
        { level: 1, label: "Surface", question: "Thank yourself for three things you've done well." },
        { level: 2, label: "Deeper", question: "Acknowledge the struggles you've survived." },
        { level: 3, label: "Core", question: "Forgive yourself for one thing you've been holding against yourself." },
      ],
    },
  ],
};

export const ENTRY_TYPES: { key: EntryType; label: string; icon: string; description: string }[] = [
  { key: "lifebook", label: "Life Book", icon: "📖", description: "Guided deep writing by section" },
  { key: "freewrite", label: "Free Write", icon: "✍️", description: "Unstructured stream of consciousness" },
  { key: "guided", label: "Guided Session", icon: "🧭", description: "Multi-step deep exploration" },
  { key: "reflection", label: "Daily Reflection", icon: "🌅", description: "Quick end-of-day check-in" },
];

export const QUICK_REFLECTIONS = [
  "What am I grateful for today?",
  "What challenged me today?",
  "What did I learn about myself?",
  "How did I show up for others?",
  "What would I do differently?",
  "What moment made me feel alive?",
];

export function getSectionProgress(entries: LifeStoryEntry[], section: LifeStorySection) {
  const sectionPrompts = SECTION_PROMPTS[section];
  const answeredIds = new Set(
    entries.filter((e) => e.section === section && e.promptId).map((e) => e.promptId)
  );
  return {
    total: sectionPrompts.length,
    completed: sectionPrompts.filter((p) => answeredIds.has(p.id)).length,
  };
}
