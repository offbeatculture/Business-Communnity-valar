// Folder hierarchy helpers.
//
// Folders nest through content_folders.parent_id (NULL = top level). The admin
// UI, the move API and the member library all need the same answers — what is
// inside what, what a folder's full path is, where a folder may be moved — so
// they live here once. No JSX and no Supabase: plain functions over a list.

export type FolderNode = {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
}

/** Lower sort_order first, then newest first — the library's existing order. */
export function compareFolders(a: FolderNode, b: FolderNode) {
  return (
    a.sort_order - b.sort_order ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * A parent whose id is not in the list is treated as top level. That keeps a
 * folder visible if its parent was somehow deleted, rather than stranding it
 * somewhere nothing links to.
 */
function effectiveParent<T extends FolderNode>(
  folder: T,
  byId: Map<string, T>
): string | null {
  return folder.parent_id && byId.has(folder.parent_id) ? folder.parent_id : null
}

export function childrenOf<T extends FolderNode>(
  folders: T[],
  parentId: string | null
): T[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  return folders
    .filter((f) => effectiveParent(f, byId) === parentId)
    .sort(compareFolders)
}

/** Every folder below `id`, at any depth. Does not include `id` itself. */
export function descendantIds<T extends FolderNode>(
  folders: T[],
  id: string
): Set<string> {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const kids = new Map<string | null, string[]>()

  for (const f of folders) {
    const parent = effectiveParent(f, byId)
    kids.set(parent, [...(kids.get(parent) ?? []), f.id])
  }

  const found = new Set<string>()
  const stack = [...(kids.get(id) ?? [])]

  while (stack.length > 0) {
    const next = stack.pop()!
    if (found.has(next)) continue // defensive: a cycle in bad data
    found.add(next)
    stack.push(...(kids.get(next) ?? []))
  }

  return found
}

/** Root first: ["2026", "June Recordings"]. */
export function folderPath<T extends FolderNode>(
  folders: T[],
  id: string
): T[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: T[] = []
  const seen = new Set<string>()
  let cursor = byId.get(id)

  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    path.unshift(cursor)
    const parent = effectiveParent(cursor, byId)
    cursor = parent ? byId.get(parent) : undefined
  }

  return path
}

export function folderPathLabel<T extends FolderNode>(
  folders: T[],
  id: string
): string {
  return folderPath(folders, id)
    .map((f) => f.name)
    .join(" › ")
}

/**
 * The whole tree flattened in display order, each folder with its depth —
 * parents directly followed by their children. For indented lists and for
 * folder pickers.
 */
export function flattenTree<T extends FolderNode>(
  folders: T[]
): { folder: T; depth: number }[] {
  const out: { folder: T; depth: number }[] = []
  const seen = new Set<string>()

  function walk(parentId: string | null, depth: number) {
    for (const folder of childrenOf(folders, parentId)) {
      if (seen.has(folder.id)) continue
      seen.add(folder.id)
      out.push({ folder, depth })
      walk(folder.id, depth + 1)
    }
  }

  walk(null, 0)
  return out
}

/**
 * Why a set of folders cannot go under `targetParentId`, or null if it can.
 * `null` as the target means "top level", which is always allowed.
 */
export function moveFoldersError<T extends FolderNode>(
  folders: T[],
  movingIds: string[],
  targetParentId: string | null
): string | null {
  if (targetParentId === null) return null

  if (!folders.some((f) => f.id === targetParentId)) {
    return "The destination folder no longer exists"
  }

  if (movingIds.includes(targetParentId)) {
    return "A folder cannot be moved inside itself"
  }

  for (const id of movingIds) {
    if (descendantIds(folders, id).has(targetParentId)) {
      const name = folders.find((f) => f.id === id)?.name ?? "A folder"
      return `"${name}" cannot be moved inside one of its own subfolders`
    }
  }

  return null
}
