export interface BlogPostItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  createdAt: string;
  author: {
    id?: string;
    name: string;
    role: string;
    avatar: string;
  };
  tags: { tag: { id: string; name: string } }[];
  _count?: {
    comments: number;
    exercises: number;
  };
  comments?: Array<{
    id: string;
    author: { name: string; role?: string };
    content: string;
    createdAt: string;
  }>;
  exercises?: Array<{
    id: string;
    title: string;
    description: string;
    fileUrl?: string;
  }>;
}
