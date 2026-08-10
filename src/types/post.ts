export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  author: Author;
  category: Category;
  tags: Tag[];
}

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  email: string;
  website: string | null;
  content: string;
  ip: string | null;
  region: string | null;
  os: string | null;
  browser: string | null;
  visible: boolean;
  createdAt: string;
}
