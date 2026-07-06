export function buildMenuTree(menus: { id: string; label: string; href: string | null; icon: string | null; type: string; parentId: string | null; sortOrder: number; visible: boolean; target: string | null; createdAt: Date; updatedAt: Date }[]) {
  const map = new Map<string, any>()
  const roots: any[] = []

  const sorted = [...menus].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  for (const menu of sorted) {
    const node = { ...menu, children: [] }
    map.set(menu.id, node)
  }

  for (const menu of sorted) {
    const node = map.get(menu.id)
    if (menu.parentId && map.has(menu.parentId)) {
      const parent = map.get(menu.parentId)
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
