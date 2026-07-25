export type ChatCitation = {
  sourceId: string;
  sourceTitle: string;
  sourceType?: "PDF" | "YOUTUBE" | "WEBSITE" | "MARKDOWN" | "TEXT" | "VTT";
  sourceUrl?: string | null;
  pageNumber?: number | null;
  chunkId: string;
  preview: string;
  timestampStartMs?: number | null;
  timestampEndMs?: number | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  streaming?: boolean;
  citations?: ChatCitation[];
};

export type NotebookConversation = {
  id: string;
  notebookId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ id: string; conversationId: string; role: "USER" | "ASSISTANT"; content: string; citations: ChatCitation[] | null; createdAt: string; updatedAt: string }>;
};

export type NotebookWorkspaceSnapshot = {
  conversations: NotebookConversation[];
  activeConversationId: string | null;
};
