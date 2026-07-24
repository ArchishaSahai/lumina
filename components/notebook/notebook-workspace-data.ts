import type { LucideIcon } from "lucide-react";
import { FileText, Film, FileCode2, Presentation } from "lucide-react";

export type Conversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
  streaming?: boolean;
};

export type NotebookSource = {
  name: string;
  meta: string;
  icon: LucideIcon;
};

export const conversations: Conversation[] = [
  { id: "transformers", title: "Understanding Transformers", preview: "Attention, embeddings, and context windows", updatedAt: "Just now" },
  { id: "operating-systems", title: "Operating Systems", preview: "Process scheduling and memory", updatedAt: "2h ago" },
  { id: "system-design", title: "System Design", preview: "Designing a resilient queue", updatedAt: "Yesterday" },
  { id: "ml-notes", title: "Machine Learning Notes", preview: "Evaluating model performance", updatedAt: "Jul 22" },
];

export const messagesByConversation: Record<string, ChatMessage[]> = {
  transformers: [
    {
      id: "question-1",
      role: "user",
      content: "Can you explain why self-attention is so effective for sequence modeling?",
      timestamp: "10:32 AM",
    },
    {
      id: "answer-1",
      role: "assistant",
      content: "Self-attention lets every token weigh the relevance of every other token in the same sequence. Unlike recurrent models, it does this in parallel, so it can connect distant ideas without passing information through many intermediate steps. The result is a flexible representation that adapts to the context of each token.",
      timestamp: "10:32 AM",
      citations: ["Research.pdf · p. 14", "Lecture 08.mp4 · 18:42"],
    },
    {
      id: "answer-2",
      role: "assistant",
      content: "For your notes, the important trade-off is that attention grows with the number of token pairs. That makes long documents more demanding, which is why chunking and efficient attention variants matter.",
      timestamp: "10:33 AM",
      citations: ["Research.pdf · p. 18"],
      streaming: true,
    },
  ],
  "operating-systems": [
    { id: "os-question", role: "user", content: "What is the difference between a process and a thread?", timestamp: "Yesterday" },
    { id: "os-answer", role: "assistant", content: "A process owns its memory and system resources, while threads are execution paths that share the resources of their parent process. Sharing makes threads lightweight, but it also creates synchronization concerns.", timestamp: "Yesterday", citations: ["Operating Systems Notes.md · §3.2"] },
  ],
  "system-design": [
    { id: "system-question", role: "user", content: "Where should a message queue sit in an upload pipeline?", timestamp: "Jul 23" },
    { id: "system-answer", role: "assistant", content: "Place the queue after durable upload acceptance and before asynchronous processing. It isolates the user-facing upload path from slower work while allowing consumers to scale independently.", timestamp: "Jul 23", citations: ["System Design.pdf · p. 31"] },
  ],
  "ml-notes": [
    { id: "ml-question", role: "user", content: "Which metric should I optimize for an imbalanced classifier?", timestamp: "Jul 22" },
    { id: "ml-answer", role: "assistant", content: "Start with precision-recall trade-offs and choose a threshold that reflects the cost of false positives and false negatives. Accuracy alone can be misleading when one class dominates.", timestamp: "Jul 22", citations: ["Research.pdf · p. 42"] },
  ],
};

export const sources: NotebookSource[] = [
  { name: "Research.pdf", meta: "38 pages · PDF", icon: FileText },
  { name: "Lecture 08.mp4", meta: "46 min · Video", icon: Film },
  { name: "Operating Systems Notes.md", meta: "12 sections · Markdown", icon: FileCode2 },
  { name: "System Design.pdf", meta: "24 pages · PDF", icon: Presentation },
];
