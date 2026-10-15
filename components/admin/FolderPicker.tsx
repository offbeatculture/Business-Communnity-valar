"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { flattenTree, type FolderNode } from "@/lib/folder-tree"

/**
 * Radix Select reserves the empty string, so "top level" needs a stand-in.
 * Callers never see it — `onChange` receives null.
 */
const TOP_LEVEL = "__top_level__"

type Props = {
  folders: FolderNode[]
  value: string | null | undefined
  onChange: (folderId: string | null) => void
  placeholder?: string
  /** Offer "Top level" as a destination. For moving folders, not videos. */
  allowTopLevel?: boolean
  /** Shown but not selectable — e.g. the folders being moved and their subfolders. */
  disabledIds?: Set<string>
  className?: string
}

/**
 * A folder dropdown that shows the hierarchy: subfolders sit indented under
 * their parent, so two "June" folders under different years are told apart
 * by where they sit.
 */
export function FolderPicker({
  folders,
  value,
  onChange,
  placeholder = "Choose a folder",
  allowTopLevel = false,
  disabledIds,
  className,
}: Props) {
  const selectValue =
    value === undefined ? undefined : value === null ? TOP_LEVEL : value

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === TOP_LEVEL ? null : next)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent className="max-h-80">
        {allowTopLevel && (
          <SelectItem value={TOP_LEVEL} className="font-medium">
            Top level of the library
          </SelectItem>
        )}

        {flattenTree(folders).map(({ folder, depth }) => (
          <SelectItem
            key={folder.id}
            value={folder.id}
            disabled={disabledIds?.has(folder.id)}
            // Indent by depth. Inline because the step is computed.
            style={{ paddingLeft: 8 + depth * 16 }}
          >
            {depth > 0 && (
              <span aria-hidden className="text-muted-foreground">
                ↳
              </span>
            )}
            {folder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
