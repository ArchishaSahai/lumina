export type Notebook = {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  updatedAt: string;
  featured?: boolean;
};

export const mockNotebooks: Notebook[] = [
  { id: "machine-learning", title: "Machine Learning Crash Course", description: "Notes, papers, and lectures for building a grounded ML foundation.", sourceCount: 12, updatedAt: "Updated 2 hours ago", featured: true },
  { id: "system-design", title: "System Design Interview", description: "Patterns, trade-offs, and real-world architecture case studies.", sourceCount: 18, updatedAt: "Updated yesterday", featured: true },
  { id: "operating-systems", title: "Operating Systems", description: "A focused collection on processes, memory, and concurrency.", sourceCount: 9, updatedAt: "Updated 3 days ago" },
  { id: "product-research", title: "Product research", description: "Customer interviews, market signals, and product opportunity notes.", sourceCount: 7, updatedAt: "Updated last week" },
];
