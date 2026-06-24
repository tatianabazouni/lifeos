import OpenAI from "openai";
import AIInsight from "../models/AIInsight.js";
import { buildUserContext, checkSufficientContext, getOnboardingGuidance } from "./contextBuilder.js";
import { DREAM_TO_PLAN_PROMPT } from './DREAM_TO_PLAN_PROMPT.js';
import Goal from "../models/Goal.js";
import Task from "../models/Task.js";

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const isAiAvailable = () => Boolean(openai);

const extractTitlesFromArray = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return item;
      if (typeof item.title === "string") return item.title;
      if (typeof item.name === "string") return item.name;
      if (typeof item.task === "string") return item.task;
      if (typeof item.step === "string") return item.step;
      if (typeof item.milestone === "string") return item.milestone;
      return null;
    })
    .filter(Boolean);

const extractListFromText = (value) => {
  if (!value || typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean);
};

export const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(value.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

export const createChatCompletion = async (messages, options = {}) => {
  if (!openai) return null;

  const payload = {
    model: options.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages,
    temperature: options.temperature ?? 0.6,
  };

  if (options.response_format) {
    payload.response_format = options.response_format;
  }

  const response = await openai.chat.completions.create(payload);

  return response.choices?.[0]?.message?.content?.trim() || "";
};

export const completion = async (system, userPrompt, options = {}) => {
  const content = await createChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    options
  );

  return content || "AI unavailable: configure OPENAI_API_KEY.";
};

export const summarizeJournal = (text) => completion(
  "You are LifeOS AI. Summarize user journals with empathy and include 3 practical takeaways.",
  `Summarize this journal entry in <140 words, then list takeaways:\n${text}`
);

export const breakdownGoal = (goalText) => completion(
  "You are a goal execution coach.",
  `Break this vision/goal into SMART milestones and weekly tasks:\n${goalText}`
);

export const motivationalInsight = (context) => completion(
  "You provide concise motivational guidance rooted in progress psychology.",
  `Generate a personalized motivational message using this context:\n${context}`
);

export const analyzeLifeTheme = (content) => completion(
  "You analyze life patterns and themes from user data.",
  `Find recurring life themes and growth opportunities from:\n${content}`
);

export const generateGoalDreamReminder = (context) => completion(
  "You are LifeOS AI coach. Write concise, warm, practical nudges. Keep under 90 words.",
  `Generate one motivational reminder based on this user's active goals and dreams.\n${context}`
);

const normalizeSubtasks = (data) => {
  if (!data) return [];
  if (Array.isArray(data.subtasks)) {
    return data.subtasks
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item.title === "string") return item.title;
        if (typeof item.task === "string") return item.task;
        return null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(data.milestones)) {
    const merged = [];
    data.milestones.forEach((milestone) => {
      if (!milestone) return;
      if (typeof milestone.title === "string") merged.push(milestone.title);
      if (Array.isArray(milestone.subtasks)) {
        milestone.subtasks.forEach((subtask) => {
          if (!subtask) return;
          if (typeof subtask === "string") merged.push(subtask);
          if (typeof subtask.title === "string") merged.push(subtask.title);
        });
      }
    });
    return merged;
  }

  return [];
};

const normalizeMilestones = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return extractTitlesFromArray(data);
  if (Array.isArray(data.milestones)) return extractTitlesFromArray(data.milestones);
  if (Array.isArray(data.steps)) return extractTitlesFromArray(data.steps);
  if (Array.isArray(data.tasks)) return extractTitlesFromArray(data.tasks);
  if (Array.isArray(data.subtasks)) return extractTitlesFromArray(data.subtasks);
  if (Array.isArray(data.items)) return extractTitlesFromArray(data.items);
  return [];
};

const buildFallbackMilestones = (dream) => {
  const title = String(dream?.title || "your goal").trim();
  const description = String(dream?.description || "");
  const motivation = String(dream?.motivation || "");
  const category = String(dream?.category || "");
  const tags = Array.isArray(dream?.tags) ? dream.tags.join(" ") : "";
  const context = `${title} ${description} ${motivation} ${category} ${tags}`.toLowerCase();

  const personalize = (items) => items.map((item) => item.replace("{goal}", title));

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

  if (/(buy|house|home|apartment|car)/i.test(context)) {
    return personalize([
      "Set a budget and savings target",
      "Research options and requirements",
      "Get financing pre-approval",
      "Shortlist and evaluate choices",
      "Finalize purchase and paperwork",
      "Plan the move or delivery",
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

const generateGoalSubtasksFromDreamLegacy = async (dream) => {
  const {
    title,
    description = "",
    motivation = "",
    category = "",
    targetYear = "",
    tags = [],
  } = dream || {};

  const system = [
    "You are an expert goal execution coach.",
    "Return ONLY valid JSON with this shape:",
    '{ "subtasks": [ { "title": "Verb-first task", "detail": "Short detail", "effort_hours": 2, "priority": "high|medium|low" } ] }',
    "Create 6-10 subtasks that are concrete, actionable, and ordered logically.",
    "Keep each title under 12 words.",
  ].join(" ");

  const prompt = [
    "Create a detailed plan for this dream/goal.",
    `Title: ${title || "Untitled dream"}`,
    description ? `Description: ${description}` : "",
    motivation ? `Motivation: ${motivation}` : "",
    category ? `Category: ${category}` : "",
    targetYear ? `Target Year: ${targetYear}` : "",
    Array.isArray(tags) && tags.length > 0 ? `Tags: ${tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await completion(system, prompt);
  const parsed = safeJsonParse(raw);
  const subtasks = normalizeSubtasks(parsed)
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12);

  return subtasks;
};

const generateGoalMilestonesFromDreamLegacy = async (dream) => {
  const {
    title,
    description = "",
    motivation = "",
    category = "",
    targetYear = "",
    tags = [],
  } = dream || {};

  if (!openai) {
    return { milestones: buildFallbackMilestones(dream), source: "fallback" };
  }

  const system = [
    "You are an expert goal execution coach.",
    "Return ONLY valid JSON with this shape:",
    '{ "milestones": [ { "title": "Milestone title", "detail": "Short detail", "estimated_weeks": 4 } ] }',
    "Create 4-8 milestones that are clear and sequential.",
    "Keep each title under 10 words.",
    "Make milestones specific to the dream and include key nouns from the title/description.",
    "Avoid generic milestones that could apply to any goal.",
  ].join(" ");

  const prompt = [
    "Create a milestone plan for this dream/goal.",
    `Title: ${title || "Untitled dream"}`,
    description ? `Description: ${description}` : "",
    motivation ? `Motivation: ${motivation}` : "",
    category ? `Category: ${category}` : "",
    targetYear ? `Target Year: ${targetYear}` : "",
    Array.isArray(tags) && tags.length > 0 ? `Tags: ${tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await completion(system, prompt);
  const parsed = safeJsonParse(raw);
  let milestones = normalizeMilestones(parsed);
  if (milestones.length === 0) {
    milestones = extractListFromText(raw);
  }
  milestones = Array.from(new Set(milestones.map((t) => String(t).trim()).filter(Boolean))).slice(0, 10);

  if (milestones.length === 0) {
    return { milestones: buildFallbackMilestones(dream), source: "fallback" };
  }

return { milestones, source: "ai" };
};

const cleanText = (value, fallback = "") => String(value || fallback).trim();

const uniqueTextList = (items = [], max = 10) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.title || item.name || item.task || item.step || item.milestone || item.text || "";
    })
    .map((item) => cleanText(item).replace(/\s+/g, " "))
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
};

const getDreamContext = (dream = {}) => {
  const title = cleanText(dream.title, "your goal");
  const description = cleanText(dream.description);
  const motivation = cleanText(dream.motivation);
  const category = cleanText(dream.category);
  const tags = Array.isArray(dream.tags) ? dream.tags.filter(Boolean).join(", ") : "";
  const text = `${title} ${description} ${motivation} ${category} ${tags}`.toLowerCase();

  return {
    title,
    description,
    motivation,
    category,
    targetYear: dream.targetYear || "",
    tags,
    text,
  };
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const deadlineLabel = (index, total, targetYear) => {
  const now = new Date();
  const parsedTargetYear = Number(targetYear);

  if (parsedTargetYear && parsedTargetYear >= now.getFullYear()) {
    const monthsRemaining = Math.max(1, (parsedTargetYear - now.getFullYear()) * 12 + 11 - now.getMonth());
    const monthOffset = Math.max(1, Math.round(((index + 1) / Math.max(total, 1)) * monthsRemaining));
    const planned = addMonths(now, monthOffset);
    return planned.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  return addMonths(now, index + 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const makePhase = (index, total, targetYear, title, milestones, actionSteps) => ({
  title: cleanText(title, `Phase ${index + 1}`),
  deadline: deadlineLabel(index, total, targetYear),
  milestones: uniqueTextList(milestones, 5),
  actionSteps: uniqueTextList(actionSteps, 6),
});

const normalizeAnalysis = (analysis = {}, fallback = {}) => ({
  visionSummary: cleanText(analysis.visionSummary || analysis.summary, fallback.visionSummary),
  domain: cleanText(analysis.domain, fallback.domain),
  transformationType: cleanText(analysis.transformationType || analysis.type, fallback.transformationType),
  hiddenRequirements: uniqueTextList(analysis.hiddenRequirements || analysis.requirements || fallback.hiddenRequirements, 8),
  requiredSkills: uniqueTextList(analysis.requiredSkills || analysis.skills || fallback.requiredSkills, 8),
  transformationComponents: uniqueTextList(
    analysis.transformationComponents || analysis.components || fallback.transformationComponents,
    8
  ),
  successDefinition: cleanText(analysis.successDefinition, fallback.successDefinition),
});

export const flattenRoadmapItems = (plan) => {
  const items = [];
  const seen = new Set();

  (Array.isArray(plan?.phases) ? plan.phases : []).forEach((phase) => {
    const phaseTitle = cleanText(phase.title);
    [
      ...(Array.isArray(phase.milestones) ? phase.milestones.map((title) => ({ title, kind: "milestone" })) : []),
      ...(Array.isArray(phase.actionSteps) ? phase.actionSteps.map((title) => ({ title, kind: "action" })) : []),
    ].forEach((item) => {
      const title = cleanText(item.title);
      const key = `${phaseTitle}:${title}`.toLowerCase();
      if (!title || seen.has(key)) return;
      seen.add(key);
      items.push({
        title,
        done: false,
        phaseTitle,
        kind: item.kind,
      });
    });
  });

  return items;
};

const buildFallbackGoalRoadmap = (dream) => {
  const context = getDreamContext(dream);
  const { title, text, targetYear } = context;
  const isSoftwareCareer = /(software|developer|engineer|coding|programmer|computer science|cs\b|internship|job|github|portfolio|dsa|graduate|graduating)/i.test(text);
  const isPilgrimageApp = /(pilgrim|pilgrimage|medjugorje|church|spiritual travel|prayer)/i.test(text) && /(app|platform|product|software)/i.test(text);
  const isProduct = /(app|platform|saas|startup|business|product|marketplace|store|shop)/i.test(text);
  const isFitness = /(fitness|gym|workout|lose weight|run|marathon|health|strength|nutrition)/i.test(text);
  const isWriting = /(write|book|novel|story|blog|script|publish)/i.test(text);
  const isTravel = /(travel|trip|visit|vacation|tour|relocate)/i.test(text);
  const isLearning = /(learn|study|course|skill|language|degree|certificate|certification)/i.test(text);

  let analysis = {
    visionSummary: `Turn "${title}" into a concrete execution roadmap.`,
    domain: "personal transformation",
    transformationType: "goal execution",
    hiddenRequirements: ["Clear success criteria", "Consistent weekly execution", "Feedback from relevant people"],
    requiredSkills: ["Planning", "Consistency", "Progress review"],
    transformationComponents: ["Research", "Practice", "Feedback", "Delivery"],
    successDefinition: `A visible outcome that proves progress toward "${title}".`,
  };
  let phaseTemplates = [
    {
      title: `Map the Real Requirements Behind ${title}`,
      milestones: [`Define the exact outcome for ${title}`, "Identify the people, tools, and constraints involved"],
      actionSteps: ["Write a one-page success definition", "List 5 resources or mentors connected to this goal", "Choose the first weekly action you can finish"],
    },
    {
      title: "Build the First Proof of Progress",
      milestones: ["Complete the smallest meaningful version", "Create a repeatable weekly workflow"],
      actionSteps: ["Block two focused sessions this week", "Finish one visible deliverable", "Track what was completed and what blocked progress"],
    },
    {
      title: "Test, Improve, and Make It Sustainable",
      milestones: ["Get feedback from someone relevant", "Improve the plan based on evidence"],
      actionSteps: ["Share progress with one trusted person", "Remove one unrealistic step", "Define the next 30-day milestone"],
    },
  ];
  let successIndicators = [
    `A clear success definition for ${title}`,
    "Weekly progress is visible and trackable",
    "At least one real deliverable or proof of progress exists",
    "Feedback has been used to improve the plan",
  ];
  let personalReminder = "You do not need the perfect plan before starting. You need a clear next action, honest feedback, and steady progress.";

  if (isSoftwareCareer) {
    analysis = {
      visionSummary: "Become ready for a software development job by building technical skill, proof of work, and interview confidence.",
      domain: "software engineering career",
      transformationType: "career readiness",
      hiddenRequirements: ["A public portfolio", "Interview practice", "GitHub consistency", "Real project explanations", "Application pipeline"],
      requiredSkills: ["Programming fundamentals", "Data Structures and Algorithms", "Git and GitHub", "Full-stack development", "Technical communication"],
      transformationComponents: ["Foundation", "Portfolio", "Experience", "Interview preparation", "Applications and networking"],
      successDefinition: "A job-ready profile with deployable projects, interview readiness, and active applications.",
    };
    phaseTemplates = [
      {
        title: "Build Strong Technical Foundations",
        milestones: ["Strengthen programming fundamentals", "Improve problem-solving confidence", "Review core CS subjects"],
        actionSteps: ["Master one primary language deeply", "Solve beginner DSA problems 3-4 times weekly", "Review databases, OS, networking, and APIs", "Keep GitHub commits consistent"],
      },
      {
        title: "Create a Portfolio That Proves Skill",
        milestones: ["Complete 3-5 polished projects", "Deploy at least one full-stack project", "Document projects professionally"],
        actionSteps: ["Build a full-stack web app", "Build one AI-powered or automation project", "Add READMEs, screenshots, and live demo links", "Create a clean portfolio website"],
      },
      {
        title: "Gain Real Development Experience",
        milestones: ["Show collaboration experience", "Practice professional workflows", "Earn internship or freelance signals"],
        actionSteps: ["Apply to internships weekly", "Join a team, hackathon, or university project", "Practice Git branches, pull requests, and API integration", "Ask for feedback from a mentor or senior developer"],
      },
      {
        title: "Prepare for Interviews and Applications",
        milestones: ["Create an ATS-friendly CV", "Practice technical and HR interviews", "Prepare project demos"],
        actionSteps: ["Practice common coding interview patterns", "Explain each portfolio project in 2 minutes", "Optimize LinkedIn and GitHub profile", "Run mock interviews and collect feedback"],
      },
      {
        title: "Apply and Build a Hiring Pipeline",
        milestones: ["Submit targeted applications weekly", "Grow a professional network", "Secure interviews or referrals"],
        actionSteps: ["Apply to junior and internship roles every week", "Message alumni, recruiters, and local developers", "Customize CV for each role", "Track applications, follow-ups, and interview status"],
      },
    ];
    successIndicators = [
      "Strong GitHub portfolio with recent commits",
      "3-5 documented and deployed projects",
      "Professional CV and LinkedIn profile",
      "Interview practice routine is active",
      "Weekly applications and networking are tracked",
      "At least one interview pipeline, referral, internship, or offer",
    ];
    personalReminder = "You do not need to be perfect before applying. You only need to be consistent, prepared, and visibly improving over time.";
  } else if (isPilgrimageApp) {
    analysis = {
      visionSummary: "Design a pilgrimage app around the emotional, spiritual, and logistical needs of Medjugorje travelers.",
      domain: "pilgrimage travel technology",
      transformationType: "mission-driven product build",
      hiddenRequirements: ["Pilgrim interviews", "Church group workflows", "Multilingual support", "Spiritual journey sensitivity", "Travel coordination constraints"],
      requiredSkills: ["User research", "Travel workflow design", "Mobile product design", "Group coordination", "Community validation"],
      transformationComponents: ["Pilgrim needs", "Pilgrimage features", "MVP build", "Field testing", "Launch partnerships"],
      successDefinition: "A validated app that helps Medjugorje pilgrims plan, coordinate, pray, and travel with less stress.",
    };
    phaseTemplates = [
      {
        title: "Understand Medjugorje Pilgrim Needs",
        milestones: ["Interview recent Medjugorje pilgrims", "Map pilgrimage travel pain points", "Understand church group organization"],
        actionSteps: ["Interview pilgrims, group leaders, and travel organizers", "List prayer, schedule, transport, and lodging pain points", "Document emotional and spiritual moments in the journey", "Study multilingual communication needs"],
      },
      {
        title: "Design Pilgrimage-Specific Features",
        milestones: ["Define group prayer coordination", "Design pilgrimage itinerary planning", "Map group communication flows"],
        actionSteps: ["Sketch itinerary screens for Mass, apparition hill, travel, and free time", "Design group notices and leader announcements", "Plan multilingual content and emergency info", "Create a spiritual reflection or prayer journal flow"],
      },
      {
        title: "Build a Focused Pilgrimage MVP",
        milestones: ["Create trip management basics", "Build schedule and group tools", "Add spiritual reflection features"],
        actionSteps: ["Build group pilgrimage profiles", "Implement itinerary and reminders", "Add group communication or announcement tools", "Create a prayer/reflection section"],
      },
      {
        title: "Test With Real Pilgrimage Groups",
        milestones: ["Run usability testing with pilgrims", "Validate leader workflows", "Improve confusing travel steps"],
        actionSteps: ["Test prototypes with 5-10 target users", "Ask a church group leader to review the flow", "Collect feedback on language, trust, and spiritual tone", "Prioritize fixes before launch"],
      },
      {
        title: "Prepare Launch Partnerships",
        milestones: ["Build credibility with travel/church partners", "Create launch materials", "Open first pilot group"],
        actionSteps: ["Prepare a demo for pilgrimage organizers", "Create onboarding instructions for group leaders", "Identify first travel agency or parish pilot", "Track pilot usage and support requests"],
      },
    ];
    successIndicators = [
      "Pilgrim interviews and pain points are documented",
      "A clickable pilgrimage itinerary and group flow exists",
      "MVP includes travel coordination and spiritual journey features",
      "A real church group, organizer, or pilgrimage traveler has tested it",
      "At least one pilot partner is ready to try the app",
    ];
    personalReminder = "This app should serve the pilgrimage, not distract from it. Build technology that makes the journey calmer, more organized, and more meaningful.";
  } else if (isProduct) {
    analysis.domain = "product or business build";
    analysis.transformationType = "validated product execution";
    analysis.hiddenRequirements = ["Specific user segment", "Pain point validation", "Feature prioritization", "Pilot users", "Feedback loop"];
    analysis.requiredSkills = ["User research", "Product scoping", "MVP execution", "Customer feedback", "Launch operations"];
    analysis.transformationComponents = ["Discovery", "Solution design", "MVP build", "Pilot testing", "Launch iteration"];
    phaseTemplates = [
      {
        title: `Research the Exact Users for ${title}`,
        milestones: ["Identify the narrow first audience", "Validate the real pain point", "Define the first use case"],
        actionSteps: ["Interview 5-10 likely users", "Write repeated pain points in their own words", "Compare current alternatives they use", "Choose one first-user segment"],
      },
      {
        title: "Design a Focused Solution",
        milestones: ["Select the core workflow", "Create a lean feature map", "Define success metrics"],
        actionSteps: ["Sketch the user's before-and-after workflow", "Cut non-essential features from the first version", "Create wireframes for the core screens", "Define what a successful pilot must prove"],
      },
      {
        title: "Build the First Usable Version",
        milestones: ["Create a usable MVP", "Implement the highest-value workflow", "Prepare onboarding"],
        actionSteps: [
          "Invite 5-20 pilot users",
          "Watch where users hesitate or drop off",
          "Fix the top 3 friction points",
          "Collect testimonials, objections, and feature requests",
          "Add feedback capture"
        ]
      },
      {
        title: "Pilot With Real Users",
        milestones: ["Recruit first testers", "Measure usage and confusion", "Iterate from feedback"],
        actionSteps: ["Invite 5-20 pilot users", "Watch where users hesitate or drop off", "Fix the top 3 friction points", "Collect testimonials, objections, and feature requests"],
      },
      {
        title: "Launch and Improve the Offer",
        milestones: ["Package a clear offer", "Create a repeatable acquisition channel", "Plan the next release"],
        actionSteps: ["Write the landing page or launch message", "Reach out through one focused channel", "Track signups, usage, and feedback weekly", "Choose the next feature from user evidence"],
      },
    ];
  } else if (isFitness) {
    analysis.domain = "fitness and health";
    analysis.transformationType = "body and habit transformation";
    analysis.hiddenRequirements = ["Baseline measurement", "Safe progression", "Recovery", "Nutrition consistency", "Weekly tracking"];
    analysis.requiredSkills = ["Exercise technique", "Meal planning", "Habit tracking", "Recovery management"];
    analysis.transformationComponents = ["Baseline", "Routine", "Nutrition", "Progressive overload", "Maintenance"];
    phaseTemplates = [
      {
        title: "Measure Your Starting Point",
        milestones: ["Record baseline metrics", "Choose realistic target metrics", "Identify health constraints"],
        actionSteps: ["Record weight, measurements, stamina, or strength baseline", "Choose 2-3 metrics to track weekly", "Check injuries, schedule limits, and equipment access"],
      },
      {
        title: "Build the Weekly Training Routine",
        milestones: ["Create a repeatable workout schedule", "Learn correct movement technique", "Complete first two consistent weeks"],
        actionSteps: ["Plan 3-4 workouts per week", "Start with manageable sets and intensity", "Track completed sessions", "Adjust exercises that cause pain or burnout"],
      },
      {
        title: "Support Progress With Nutrition and Recovery",
        milestones: ["Create a simple meal structure", "Improve sleep and recovery", "Reduce inconsistency triggers"],
        actionSteps: ["Prepare protein-centered meals", "Hydrate daily", "Schedule rest days", "Note cravings, skipped workouts, and energy patterns"],
      },
      {
        title: "Increase Intensity Safely",
        milestones: ["Progress workouts gradually", "Review weekly measurements", "Stay consistent under real-life pressure"],
        actionSteps: ["Increase reps, weight, distance, or pace slowly", "Review data every weekend", "Plan backup workouts for busy days", "Celebrate consistency before scale changes"],
      },
    ];
  } else if (isWriting) {
    analysis.domain = "writing and publishing";
    analysis.transformationType = "creative production";
    analysis.hiddenRequirements = ["Clear concept", "Writing schedule", "Revision system", "Reader feedback", "Publishing plan"];
    analysis.requiredSkills = ["Outlining", "Drafting", "Editing", "Feedback processing", "Publishing"];
    analysis.transformationComponents = ["Concept", "Draft", "Revision", "Feedback", "Release"];
    phaseTemplates = [
      {
        title: `Shape the Core Idea of ${title}`,
        milestones: ["Define audience and promise", "Outline the structure", "Set a writing rhythm"],
        actionSteps: ["Write the one-sentence premise", "Create chapter or section bullets", "Choose weekly writing sessions", "Collect reference material"],
      },
      {
        title: "Draft Without Overediting",
        milestones: ["Complete a rough first draft", "Build momentum with word-count targets", "Protect creative consistency"],
        actionSteps: ["Write in timed sessions", "Track words or pages weekly", "Leave editing notes instead of stopping", "Finish the draft before polishing"],
      },
      {
        title: "Revise With Reader Feedback",
        milestones: ["Improve structure and clarity", "Get beta-reader feedback", "Prepare final edits"],
        actionSteps: ["Revise one section at a time", "Share with 3-5 relevant readers", "Collect confusing or weak sections", "Apply feedback without losing your voice"],
      },
      {
        title: "Prepare and Publish",
        milestones: ["Finalize manuscript or content", "Choose publishing channel", "Create launch materials"],
        actionSteps: ["Proofread the final version", "Format for the chosen platform", "Write a short launch description", "Share with the first audience"],
      },
    ];
  } else if (isTravel) {
    analysis.domain = "travel planning";
    analysis.transformationType = "logistics and experience planning";
    analysis.hiddenRequirements = ["Budget", "Documents", "Itinerary", "Transport", "Safety and timing"];
    analysis.requiredSkills = ["Budgeting", "Research", "Scheduling", "Travel logistics"];
    analysis.transformationComponents = ["Destination research", "Budget", "Bookings", "Preparation", "Experience"];
    phaseTemplates = [
      {
        title: `Define the Trip Version of ${title}`,
        milestones: ["Choose dates and trip length", "Set budget range", "Identify must-see experiences"],
        actionSteps: ["Pick ideal and backup dates", "Estimate flights, lodging, food, and activities", "List top locations and non-negotiable experiences"],
      },
      {
        title: "Plan Logistics and Bookings",
        milestones: ["Book major transport", "Choose accommodation", "Prepare required documents"],
        actionSteps: ["Compare flight or transport options", "Reserve lodging near priority areas", "Check passport, visa, insurance, and local rules", "Create a shared itinerary"],
      },
      {
        title: "Prepare the Experience",
        milestones: ["Finalize daily itinerary", "Plan safety and money basics", "Pack intentionally"],
        actionSteps: ["Group activities by location", "Save offline maps and emergency contacts", "Prepare payment options and local transport plan", "Create a packing checklist"],
      },
    ];
  } else if (isLearning) {
    analysis.domain = "learning and skill development";
    analysis.transformationType = "skill acquisition";
    analysis.hiddenRequirements = ["Current level assessment", "Practice system", "Feedback loop", "Real-world application"];
    analysis.requiredSkills = ["Deliberate practice", "Study planning", "Feedback processing", "Project-based learning"];
    analysis.transformationComponents = ["Baseline", "Curriculum", "Practice", "Application", "Assessment"];
    phaseTemplates = [
      {
        title: `Define the Skill Level Needed for ${title}`,
        milestones: ["Assess current level", "Define target ability", "Choose learning path"],
        actionSteps: ["Take a baseline assessment", "Write what you must be able to do", "Choose one course, book, or mentor path", "Remove duplicate learning resources"],
      },
      {
        title: "Practice the Fundamentals",
        milestones: ["Complete core lessons", "Build practice consistency", "Track weak areas"],
        actionSteps: ["Study 3-4 times weekly", "Practice immediately after each lesson", "Keep a mistake log", "Review hard topics every weekend"],
      },
      {
        title: "Apply the Skill in Real Work",
        milestones: ["Build a practical project", "Get feedback", "Improve from evidence"],
        actionSteps: ["Choose a small real-world use case", "Finish a shareable deliverable", "Ask a skilled person for review", "Revise based on feedback"],
      },
      {
        title: "Prove Readiness",
        milestones: ["Complete assessment or portfolio proof", "Use the skill independently", "Plan the next level"],
        actionSteps: ["Take a certification, test, or challenge if relevant", "Create a before-and-after proof of progress", "Set the next 30-day skill target"],
      },
    ];
  }

  const phases = phaseTemplates.map((phase, index) =>
    makePhase(index, phaseTemplates.length, targetYear, phase.title, phase.milestones, phase.actionSteps)
  );

  return {
    goalTitle: title,
    analysis,
    phases,
    successIndicators,
    personalReminder,
    milestones: flattenRoadmapItems({ phases }).map((item) => item.title).slice(0, 20),
    source: "fallback",
  };
};

const normalizeRoadmapPlan = (data, dream, fallbackAnalysis = {}) => {
  const context = getDreamContext(dream);
  const fallback = buildFallbackGoalRoadmap(dream);
  const rawPhases = Array.isArray(data?.phases)
    ? data.phases
    : Array.isArray(data?.roadmap?.phases)
      ? data.roadmap.phases
      : [];

  const phases = rawPhases
    .map((phase, index) => ({
      title: cleanText(phase?.title || phase?.name, fallback.phases[index]?.title || `Phase ${index + 1}`),
      deadline: cleanText(phase?.deadline || phase?.estimatedDeadline, fallback.phases[index]?.deadline),
      milestones: uniqueTextList(phase?.milestones || phase?.outcomes || phase?.goals, 5),
      actionSteps: uniqueTextList(phase?.actionSteps || phase?.actions || phase?.steps || phase?.tasks, 6),
    }))
    .filter((phase) => phase.title && (phase.milestones.length || phase.actionSteps.length))
    .slice(0, 6);

  const normalizedPhases = phases.length > 0 ? phases : fallback.phases;
  const analysis = normalizeAnalysis(data?.analysis || fallbackAnalysis, fallback.analysis);
  const successIndicators = uniqueTextList(data?.successIndicators || data?.readinessIndicators || fallback.successIndicators, 8);
  const personalReminder = cleanText(data?.personalReminder || data?.reminder, fallback.personalReminder);
  const milestones = flattenRoadmapItems({ phases: normalizedPhases }).map((item) => item.title).slice(0, 20);

  return {
    goalTitle: cleanText(data?.goalTitle || data?.longTermGoal, context.title),
    analysis,
    phases: normalizedPhases,
    successIndicators,
    personalReminder,
    milestones,
  };
};

const buildDreamPrompt = (dream) => {
  const { title, description, motivation, category, targetYear, tags } = getDreamContext(dream);
  return [
    `Current date: ${new Date().toISOString().slice(0, 10)}`,
    `Goal/Dream: ${title}`,
    description ? `Vision/Explanation: ${description}` : "",
    motivation ? `Motivation: ${motivation}` : "",
    category ? `Category: ${category}` : "",
    targetYear ? `Target year: ${targetYear}` : "",
    tags ? `Tags: ${tags}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const generateDreamAnalysis = async (dream) => {
  const fallback = buildFallbackGoalRoadmap(dream).analysis;
  const system = [
    "You are the DREAM ANALYSIS stage of an AI Goal -> Structured Milestone Engine.",
    "Do not create milestones yet.",
    "Deeply analyze the user's dream before planning.",
    "Infer the domain, hidden requirements, required skills, transformation components, likely constraints, and concrete success definition.",
    "Return ONLY valid JSON with keys: analysis.",
    "analysis must contain visionSummary, domain, transformationType, hiddenRequirements, requiredSkills, transformationComponents, successDefinition.",
  ].join(" ");

  const raw = await createChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: buildDreamPrompt(dream) },
    ],
    { temperature: 0.35, response_format: { type: "json_object" } }
  );
  const parsed = safeJsonParse(raw);
  return normalizeAnalysis(parsed?.analysis || parsed, fallback);
};

const generateRoadmapFromAnalysis = async (dream, analysis) => {
  const system = [
    "You are the SMART MILESTONE GENERATION stage of an AI Goal -> Structured Milestone Engine.",
    "You must use the provided dream analysis, decomposition, required skills, and transformation components before generating the roadmap.",
    "Act like a professional strategist, transformation architect, and execution planner.",
    "Return ONLY valid JSON with this shape:",
    '{"goalTitle":"...","analysis":{},"phases":[{"title":"Phase 1 - Domain-specific title","deadline":"Month YYYY","milestones":["specific outcome"],"actionSteps":["small concrete action"]}],"successIndicators":["measurable indicator"],"personalReminder":"realistic reminder"}',
    "Rules:",
    "Create 4-6 realistic phases when the goal is career/product/business; 3-5 phases for simpler goals.",
    "Each phase needs 2-4 milestones and 3-5 action steps.",
    "Every item must be specific to THIS dream and include domain nouns, user audience, tools, skills, or context from the analysis.",
    "Make action steps small enough to complete in days, not vague ambitions.",
    "Use SMART wording: concrete action, observable output, realistic sequence, estimated deadline.",
    "Never use generic template lines like Clarify the problem, Build MVP, Launch MVP, Get users, Stay motivated, Work hard, Learn coding.",
    "If the dream is about software career, include programming foundations, DSA, projects, GitHub, portfolio, internships, interviews, applications, and networking.",
    "If the dream is about an app, include user research, domain workflows, feature design, MVP, testing, and launch validation tailored to the exact app domain.",
  ].join(" ");

  const prompt = [
    buildDreamPrompt(dream),
    "",
    "Dream analysis to use before planning:",
    JSON.stringify(analysis, null, 2),
    "",
    "Generate the structured transformation roadmap now.",
  ].join("\n");

  const raw = await createChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.55, response_format: { type: "json_object" } }
  );
  const parsed = safeJsonParse(raw);
  return normalizeRoadmapPlan(parsed, dream, analysis);
};

export const generateGoalSubtasksFromDream = async (dream) => {
  const plan = await generateGoalMilestonesFromDream(dream);
  return flattenRoadmapItems(plan)
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 12);
};

export const generateGoalMilestonesFromDream = async (dream) => {
  if (!openai) {
    return buildFallbackGoalRoadmap(dream);
  }

  try {
    const analysis = await generateDreamAnalysis(dream);
    const plan = await generateRoadmapFromAnalysis(dream, analysis);
    return {
      ...plan,
      source: "ai",
    };
  } catch (error) {
    console.error("Goal roadmap generation failed:", error);
    return buildFallbackGoalRoadmap(dream);
  }
};

// ============================================================
// PERSONALIZED AI SYSTEM - NEW FUNCTIONS
// ============================================================

/**
 * Generate personalized insight based on user context
 * This is the CORE function for the highly personalized AI system
 * @param {object} context - User context from buildUserContext()
 * @returns {object} Structured insight or fallback
 */
export const generatePersonalizedInsight = async (context) => {
  // Check if sufficient context for AI insights
  const contextCheck = checkSufficientContext(context);

  if (!contextCheck.sufficient) {
    // Return onboarding guidance instead of AI insight
    return {
      ...getOnboardingGuidance(),
      source: "fallback",
      reason: contextCheck.reason,
    };
  }

  // If AI is not available, return a simple fallback
  if (!openai) {
    return {
      emotionalState: context.emotionalState?.moodTrend || "stable",
      corePattern: context.patterns?.[0] || "Building patterns",
      mainBlocker: "AI not configured",
      strategicInsight:
        context.recentActivity?.failedTasks?.length > 0
          ? `${context.recentActivity.failedTasks.length} overdue tasks are creating execution friction.`
          : context.patterns?.[0] || "The system needs more execution data.",
      actionableShift:
        context.recentActivity?.failedTasks?.[0]?.title
          ? `Close or reschedule "${context.recentActivity.failedTasks[0].title}".`
          : "Add one goal and one journal entry so the AI can build a sharper profile.",
      source: "fallback",
    };
  }

  const compactContext = {
    identity: context.identity,
    emotionalState: context.emotionalState,
    behavior: context.behavior,
    patterns: context.patterns,
    activeGoals: context.recentActivity?.activeGoals,
    pendingTasks: context.recentActivity?.pendingTasks,
    failedTasks: context.recentActivity?.failedTasks,
    journalThemes: context.journalThemes,
    adaptiveHistory: context.adaptiveHistory,
  };

  const systemPrompt = [
    "You are the AI life coach layer of a personal life OS.",
    "Analyze the structured user context provided.",
    "Detect emotional patterns, behavior patterns, blockers, and the next concrete shift.",
    "Avoid generic encouragement. Reference actual counts, goals, failures, mood trend, and journal themes.",
    "Return ONLY valid JSON with EXACTLY these keys:",
    '{"summary":"","emotionalTone":"joyful|grateful|reflective|anxious|hopeful|determined|calm|neutral","keyInsights":["","",""],"suggestedActions":["",""],"sentiment":"positive|neutral|negative","corePattern":"","mainBlocker":""}'
  ].join("\n");

  const userPrompt = [
    "Generate one personalized strategic insight from this context.",
    JSON.stringify(compactContext, null, 2),
  ].join("\n");

  try {
    const result = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.45, response_format: { type: "json_object" } }
    );

    // Try to parse JSON from the response
    const parsed = safeJsonParse(result);

    if (parsed) {
      return {
        ...parsed,
        source: "ai",
      };
    }

    // If JSON parsing fails, try to extract key insights manually
    // Return what we can extract or a fallback
    return {
      emotionalState: context.emotionalState?.moodTrend || "stable",
      corePattern: context.patterns?.[0] || "Developing patterns",
      mainBlocker: "Unable to analyze fully",
      strategicInsight: result?.substring(0, 200) || "Keep building your context through journaling.",
      actionableShift: "Continue your journaling practice to get better insights.",
      source: "ai-parsed",
    };
  } catch (error) {
    console.error("Error generating personalized insight:", error);
    return {
      emotionalState: context.emotionalState?.moodTrend || "stable",
      corePattern: context.patterns?.[0] || "Learning",
      mainBlocker: "System error",
      strategicInsight: "Keep journaling to build your personalized insights.",
      actionableShift: "Continue your journaling practice.",
      source: "error",
      error: error.message,
    };
  }
};

const DREAM_PLAN_SCHEMA_EXAMPLE = {
  goalTitle: "",
  interpretation: {
    summary: "",
    clarity: "low|medium|high",
    difficulty: "easy|medium|hard",
    needsClarification: false,
    clarifyingQuestion: "",
    assumptions: [],
  },
  realism: {
    isRealistic: true,
    concerns: [],
    adjustedTimeline: "",
    saferAlternative: "",
  },
  phases: [
    {
      title: "",
      purpose: "",
      timeline: "",
      tasks: [
        {
          title: "",
          detail: "",
          cadence: "",
          successMeasure: "",
        },
      ],
    },
  ],
  successMeasures: [],
  coachNote: "",
};

const buildDreamMasterPrompt = (dream, context = {}) => [
  "You are a life planning AI.",
  "",
  "Convert ANY user dream into a structured transformation plan.",
  "You decide what the dream means. Do not rely on predefined categories.",
  "Handle vague, emotional, unrealistic, specific, and multi-part dreams.",
  "",
  "Reasoning rules:",
  "- Interpret the deeper intent behind the dream.",
  "- If the dream is vague, make sensible assumptions and continue.",
  "- If the dream is unrealistic or unsafe, adjust the timeline or suggest a safer version.",
  "- Split complex dreams into phases, not categories.",
  "- Make tasks concrete enough to do this week.",
  "- Use the user's behavior data only to personalize pacing and coaching tone.",
  "",
  "Return ONLY valid JSON with this exact shape:",
  JSON.stringify(DREAM_PLAN_SCHEMA_EXAMPLE),
  "",
  "Dream:",
  dream,
  "",
  "User context:",
  JSON.stringify({
    identity: context.identity || {},
    behavior: context.behavior || {},
    patterns: context.patterns || [],
    activeGoals: context.recentActivity?.activeGoals || [],
    pendingTasks: context.recentActivity?.pendingTasks || [],
    failedTasks: context.recentActivity?.failedTasks || [],
    journalThemes: context.journalThemes || {},
    lastWeeklyReview: context.adaptiveHistory?.lastWeeklyReview || null,
  }),
].join("\n");

const normalizeDreamTask = (task, index) => {
  const title = cleanText(task?.title || task?.task || task?.text || task, `Task ${index + 1}`);
  return {
    title,
    detail: cleanText(task?.detail || task?.description),
    cadence: cleanText(task?.cadence || task?.frequency),
    successMeasure: cleanText(task?.successMeasure || task?.measure || task?.metric),
  };
};

const normalizeDreamPhase = (phase, index) => {
  const tasks = (Array.isArray(phase?.tasks) ? phase.tasks : phase?.actions || phase?.steps || [])
    .map(normalizeDreamTask)
    .filter((task) => task.title)
    .slice(0, 8);

  return {
    title: cleanText(phase?.title || phase?.name, `Phase ${index + 1}`),
    purpose: cleanText(phase?.purpose || phase?.objective || phase?.summary),
    timeline: cleanText(phase?.timeline || phase?.timeframe || phase?.deadline),
    tasks,
  };
};

const buildMinimalDreamPlan = (dream, source = "fallback") => {
  const title = cleanText(dream, "Personal transformation");
  return normalizeDreamPlan(
    {
      goalTitle: title,
      interpretation: {
        summary: title,
        clarity: "medium",
        difficulty: "medium",
        needsClarification: false,
        clarifyingQuestion: "",
        assumptions: ["AI planning is unavailable, so this is a minimal editable structure."],
      },
      realism: {
        isRealistic: true,
        concerns: [],
        adjustedTimeline: "Review after 30 days",
        saferAlternative: "",
      },
      phases: [
        {
          title: "Define the transformation",
          purpose: "Turn the dream into a clear first direction.",
          timeline: "Week 1",
          tasks: [
            {
              title: "Write the desired outcome in one sentence",
              detail: "Make it specific enough to recognize progress.",
              cadence: "once",
              successMeasure: "A clear outcome sentence exists.",
            },
          ],
        },
        {
          title: "Take the first visible action",
          purpose: "Create evidence that the dream is moving.",
          timeline: "Weeks 2-4",
          tasks: [
            {
              title: "Complete one small action every week",
              detail: "Choose actions that produce visible proof, not just preparation.",
              cadence: "weekly",
              successMeasure: "At least one action is completed each week.",
            },
          ],
        },
      ],
      successMeasures: ["A clear outcome exists", "Weekly action is visible", "The plan has been reviewed once"],
      coachNote: "Start small, then let real progress sharpen the plan.",
    },
    title,
    source
  );
};

const normalizeDreamPlan = (data, dream, source = "ai") => {
  const goalTitle = cleanText(data?.goalTitle || data?.longTermGoal || data?.title, dream);
  const interpretation = {
    summary: cleanText(data?.interpretation?.summary || data?.summary, goalTitle),
    clarity: ["low", "medium", "high"].includes(data?.interpretation?.clarity)
      ? data.interpretation.clarity
      : "medium",
    difficulty: ["easy", "medium", "hard"].includes(data?.interpretation?.difficulty)
      ? data.interpretation.difficulty
      : "medium",
    needsClarification: Boolean(data?.interpretation?.needsClarification),
    clarifyingQuestion: cleanText(data?.interpretation?.clarifyingQuestion),
    assumptions: uniqueTextList(data?.interpretation?.assumptions, 6),
  };
  const realism = {
    isRealistic: typeof data?.realism?.isRealistic === "boolean" ? data.realism.isRealistic : true,
    concerns: uniqueTextList(data?.realism?.concerns, 6),
    adjustedTimeline: cleanText(data?.realism?.adjustedTimeline),
    saferAlternative: cleanText(data?.realism?.saferAlternative),
  };
  const phases = (Array.isArray(data?.phases) ? data.phases : [])
    .map(normalizeDreamPhase)
    .filter((phase) => phase.title && phase.tasks.length)
    .slice(0, 8);
  const normalizedPhases = phases.length
    ? phases
    : [
        {
          title: "Create the first concrete step",
          purpose: "Recover structure from an incomplete AI response.",
          timeline: "This week",
          tasks: [
            {
              title: `Define the first action for ${goalTitle}`,
              detail: "Choose one action that can be completed in less than a week.",
              cadence: "once",
              successMeasure: "The first action is clear and scheduled.",
            },
          ],
        },
      ];
  const allTasks = normalizedPhases.flatMap((phase) => phase.tasks);
  const successMeasures = uniqueTextList(data?.successMeasures, 8);
  const actionFrequency = (value) => {
    const normalized = cleanText(value).toLowerCase();
    if (normalized.includes("daily")) return "daily";
    if (normalized.includes("week")) return "weekly";
    return "once";
  };
  const actionEffort = (task) => {
    const text = `${task?.title || ""} ${task?.detail || ""}`.toLowerCase();
    if (/(build|launch|interview|deploy|complete|apply|publish|exam)/i.test(text)) return "high";
    if (/(practice|review|draft|research|plan|write)/i.test(text)) return "medium";
    return "low";
  };
  const lifeSystemPhases = normalizedPhases.map((phase) => ({
    phase: phase.title,
    objective: phase.purpose || `Complete the ${phase.title} stage.`,
    difficulty: interpretation.difficulty,
    estimatedDuration: phase.timeline || "1 week",
    actions: phase.tasks.map((task) => ({
      task: task.title,
      effort: actionEffort(task),
      frequency: actionFrequency(task.cadence),
    })),
  }));
  const adaptation = {
    strategy:
      interpretation.difficulty === "hard"
        ? "Begin with controlled scope, then increase challenge only after consistent completion."
        : "Keep the plan small enough to execute and let progress data adjust the next phase.",
    failureAdjustments: [
      "If completion drops below 50%, reduce the next phase to two low-effort actions.",
      "If the user misses three actions in a row, replace the current task with a smaller version that can be done in 10 minutes.",
      "If mood declines, lower task intensity and add a reflection or recovery action before productivity work.",
    ],
    progressionTriggers: [
      "Increase difficulty after five completed actions in seven days.",
      "Add a harder weekly deliverable when the user has no overdue tasks.",
      "Move to the next phase when the current phase objective is visible in the product.",
    ],
  };

  return {
    goal: goalTitle,
    goalTitle,
    longTermGoal: goalTitle,
    transformationSummary: interpretation.summary,
    interpretation,
    realism,
    phases: normalizedPhases,
    lifeSystemPlan: {
      goal: goalTitle,
      transformationSummary: interpretation.summary,
      phases: lifeSystemPhases,
      adaptation,
    },
    adaptation,
    milestones: normalizedPhases.map((phase) => phase.title),
    weeklyActions: allTasks.map((task) => task.title).slice(0, 12),
    successMeasures: successMeasures.length
      ? successMeasures
      : allTasks.map((task) => task.successMeasure).filter(Boolean).slice(0, 8),
    coachNote: cleanText(data?.coachNote, "Keep the plan flexible and update it as real progress gives you better information."),
    goals: [
      {
        title: goalTitle,
        phases: normalizedPhases,
      },
    ],
    storageReadyGoals: [
      {
        title: goalTitle,
        description: [interpretation.summary, realism.adjustedTimeline, realism.saferAlternative].filter(Boolean).join(" "),
        category: "Personal",
        priority: interpretation.difficulty === "hard" || !realism.isRealistic ? "high" : "medium",
        subtasks: normalizedPhases.flatMap((phase) =>
          phase.tasks.map((task) => ({
            title: task.title,
            done: false,
            phaseTitle: phase.title,
            kind: "action",
          }))
        ),
        roadmap: {
          goalTitle,
          analysis: { interpretation, realism },
          phases: normalizedPhases.map((phase) => ({
            title: phase.title,
            deadline: phase.timeline,
            milestones: [phase.purpose].filter(Boolean),
            actionSteps: phase.tasks.map((task) => task.title),
          })),
          successIndicators: successMeasures.length ? successMeasures : allTasks.map((task) => task.successMeasure).filter(Boolean),
          personalReminder: cleanText(data?.coachNote),
          source,
        },
      },
    ],
    needsClarification: interpretation.needsClarification,
    clarificationQuestion: interpretation.clarifyingQuestion,
    source,
  };
};

const isUsableDreamPlan = (plan) =>
  Boolean(plan?.goalTitle || plan?.longTermGoal || plan?.title) &&
  Array.isArray(plan?.phases) &&
  plan.phases.some((phase) => Array.isArray(phase?.tasks) && phase.tasks.length > 0);

const repairDreamPlanJson = async (dream, rawPlan) => {
  if (!openai) return null;

  const system = [
    "You repair JSON for a life planning app.",
    "Keep the AI's intent, but fix missing fields, invalid shapes, empty phases, and unsafe timelines.",
    "Return ONLY valid JSON with this exact shape:",
    JSON.stringify(DREAM_PLAN_SCHEMA_EXAMPLE),
  ].join("\n");

  const raw = await createChatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: `Dream: ${dream}\n\nBad or incomplete JSON:\n${JSON.stringify(rawPlan || {})}` },
    ],
    { temperature: 0.15, response_format: { type: "json_object" } }
  );

  return safeJsonParse(raw);
};

const generateMasterDreamPlan = async (dream, context) => {
  if (!openai) return buildMinimalDreamPlan(dream, "fallback");

  const raw = await createChatCompletion(
    [
      {
        role: "system",
        content: "You are the master reasoning layer. Think deeply, but output only valid JSON.",
      },
      { role: "user", content: buildDreamMasterPrompt(dream, context) },
    ],
    { temperature: 0.55, response_format: { type: "json_object" } }
  );

  const parsed = safeJsonParse(raw);
  const usablePlan = isUsableDreamPlan(parsed) ? parsed : await repairDreamPlanJson(dream, parsed);

  if (!isUsableDreamPlan(usablePlan)) {
    return buildMinimalDreamPlan(dream, "fallback");
  }

  return normalizeDreamPlan(usablePlan, dream, "ai");
};

/**
 * Transform a dream into a structured execution plan.
 * Pipeline: dream -> master prompt -> structured JSON phases -> light validation -> frontend/storage.
 * @param {string} dream - The dream/vision text
 * @param {object} context - User context from buildUserContext()
 * @returns {object} Structured plan with phases, tasks, validation, and legacy fields
 */
export const transformDreamToPlan = async (dream, context = {}) => {
  const normalizedDream = cleanText(dream);
  if (!normalizedDream) {
    return {
      goalTitle: "",
      longTermGoal: "",
      interpretation: {
        summary: "",
        clarity: "low",
        difficulty: "easy",
        needsClarification: true,
        clarifyingQuestion: "What dream would you like to transform?",
        assumptions: [],
      },
      realism: {
        isRealistic: false,
        concerns: ["Dream is required"],
        adjustedTimeline: "",
        saferAlternative: "",
      },
      phases: [],
      milestones: [],
      weeklyActions: [],
      successMeasures: [],
      coachNote: "",
      goals: [],
      storageReadyGoals: [],
      needsClarification: true,
      clarificationQuestion: "What dream would you like to transform?",
      source: "error",
      error: "Dream is required",
    };
  }

  try {
    return await generateMasterDreamPlan(normalizedDream, context);
  } catch (error) {
    console.error("Error transforming dream to plan:", error);
    return buildMinimalDreamPlan(normalizedDream, "fallback");
  }
};

const persistDailyStrategicInsight = async ({ userId, context, insight }) => {
  if (!userId || !insight) return null;
  const dateKey = new Date().toISOString().slice(0, 10);

  return AIInsight.findOneAndUpdate(
    {
      user: userId,
      topic: "strategic_insight",
      type: "daily_personalized_insight",
      "metadata.dateKey": dateKey,
    },
    {
      $set: {
        value: cleanText(insight.corePattern || insight.mainBlocker || "Personalized insight"),
        confidence: insight.source === "ai" ? 0.8 : 0.58,
        active: true,
        sourceType: "life_context",
        lastObservedAt: new Date(),
        prompt: "Personalized insight from user life context.",
        response: JSON.stringify(insight),
        model: insight.source === "ai" ? process.env.OPENAI_MODEL || "gpt-4o-mini" : "context_engine",
        metadata: {
          dateKey,
          source: insight.source,
          patterns: context.patterns || [],
          contextSnapshot: {
            journalCount: context.meta?.journalCount || 0,
            moodEntryCount: context.meta?.moodEntryCount || 0,
            goalCount: context.meta?.goalCount || 0,
            failedTaskCount: context.meta?.failedTaskCount || 0,
            consistencyScore: context.behavior?.consistencyScore || 0,
          },
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Main entry point: Get personalized insight for a user
 * Combines context building + insight generation
 * @param {string} userId - User ID
 * @returns {object} Personalized insight
 */
export const getPersonalizedInsight = async (userId) => {
  // Build user context
  const context = await buildUserContext(userId);

  // Generate personalized insight
  const insight = await generatePersonalizedInsight(context);
  await persistDailyStrategicInsight({ userId, context, insight }).catch(() => null);

  // Normalize: guarantee frontend-compatible fields always exist
  const summary = insight.summary || insight.strategicInsight || insight.corePattern || "Keep building your life story — insights deepen with more entries.";
  const keyInsights = Array.isArray(insight.keyInsights) && insight.keyInsights.length > 0 
    ? insight.keyInsights 
    : [
        insight.emotionalState ? `Emotional state: ${insight.emotionalState}` : null,
        insight.corePattern ? `Core pattern: ${insight.corePattern}` : null,
        insight.mainBlocker ? `Main blocker: ${insight.mainBlocker}` : null,
      ].filter(Boolean);
  const suggestedActions = Array.isArray(insight.suggestedActions) && insight.suggestedActions.length > 0 
    ? insight.suggestedActions 
    : insight.actionableShift 
      ? [insight.actionableShift]
      : ["Add a journal entry today to help the AI build a sharper profile."];

  return {
    ...insight,
    summary,
    keyInsights,
    suggestedActions,
    contextSnapshot: {
      journalCount: context.meta?.journalCount || 0,
      moodEntryCount: context.meta?.moodEntryCount || 0,
      goalCount: context.meta?.goalCount || 0,
      failedTaskCount: context.meta?.failedTaskCount || 0,
      consistencyScore: context.behavior?.consistencyScore || 0,
    },
    patterns: context.patterns || [],
    nextWeeklyFocus: context.adaptiveHistory?.lastWeeklyReview?.nextWeekFocus || "",
  };


};

// ===== DREAM-TO-GOAL PIPELINE =====

/**
 * STEP 2-4: Generate AI plan from dream with validation/retry
 * @param {string} dream 
 * @param {object} userContext 
 * @returns {object} Validated aiData {goal, milestones, habits, risks, tasks}
 */
export const generatePlan = async (dream, userContext) => {
  if (!dream?.trim()) throw new Error('Dream required');

  // Get context or fallback
  const context = userContext || { role: 'Student', focus: ['Final semester', 'productivity', 'discipline'] };

  // STEP 1: Master prompt
  const systemPrompt = DREAM_TO_PLAN_PROMPT(dream, context);

  let rawResponse;
  let aiData;

  // Primary call
  try {
    rawResponse = await createChatCompletion(
      [{ role: 'system', content: systemPrompt }],
      { 
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      }
    );
    aiData = safeJsonParse(rawResponse);
  } catch (e) {
    console.error('Primary OpenAI call failed:', e);
    aiData = null;
  }

  // STEP 3: Retry if invalid JSON
  if (!aiData || !aiData.goal || !Array.isArray(aiData.milestones)) {
    const retryPrompt = `Dream: "${dream}"\n\nPrevious invalid response: "${rawResponse?.substring(0, 200)}"\n\nReturn ONLY valid JSON. No explanation.`;
    
    try {
      const retryResponse = await createChatCompletion(
        [
          { role: 'system', content: 'Return ONLY valid JSON matching schema. No other text.' },
          { role: 'user', content: retryPrompt }
        ],
        { temperature: 0.1, max_tokens: 800 }
      );
      aiData = safeJsonParse(retryResponse);
    } catch (e) {
      console.error('Retry failed:', e);
    }
  }

  // STEP 4: Final validation
  if (!aiData || !aiData.goal) {
    throw new Error('AI failed to generate valid plan after retry');
  }

  // Post-process: flatten tasks
  const flattenedTasks = [];
  aiData.milestones.forEach((milestone, index) => {
    if (milestone.tasks && Array.isArray(milestone.tasks)) {
      milestone.tasks.forEach(task => flattenedTasks.push(task));
    }
  });

  return {
    ...aiData,
    tasks: flattenedTasks
  };
};
export const transformUserDreamToPlan = async (userId, dream) => {
  // Build minimal context for identity info
  const context = await buildUserContext(userId);

  return await transformDreamToPlan(dream, context);
};
