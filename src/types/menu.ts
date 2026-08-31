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
