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

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  siteLogo: string;
  favicon: string;
  icp: string;
  footerText: string;
  siteStartDate: string;
  footerTechInfo: string;
  postsPerPage: string;
  twikooEnvId: string;
  fontCssUrl: string;
  fontFamily: string;
  backgroundImage: string;
  heroType: string;
  heroImage: string;
  heroVideo: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface MenuItem {
  id: string;
  label: string;
  href: string | null;
  icon: string | null;
  type: string;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  target: string | null;
  createdAt: string;
  updatedAt: string;
  children: MenuItem[];
}
