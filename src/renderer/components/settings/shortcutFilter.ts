/**
 * The pure filter model behind the Keyboard Shortcuts section's rail: what STATE a row is in,
 * whether a status filter keeps it, and whether the local query finds it.
 *
 * Pure on purpose — it imports nothing but shared types, so the same functions answer for the
 * visible rows and for the counts printed on the segmented pill. The section computes each row's
 * effective binding count once (`commandKeysFor(id).length`) and passes it in; this file never
 * reaches into settings state, which is what lets the counts be computed for ALL rows in one pass
 * without a second read path that could disagree with the rendered list.
 */
import type { CommandDefinition, CommandId, KeybindingOverrides } from '@shared/keybindings'

export type ShortcutStatusFilter = 'all' | 'modified' | 'unassigned' | 'disabled'

export interface ShortcutRowStatus {
  /** The overrides map carries this id — with ANY value, `[]` included. */
  modified: boolean
  /** The override is exactly `[]`, the disable sentinel. */
  disabled: boolean
  /** Zero effective bindings and NOT explicitly disabled — an unbound default like
   *  `canvas.fitAll`, or an override the read path reduced to nothing. */
  unassigned: boolean
}

export function shortcutRowStatus(
  id: CommandId,
  overrides: KeybindingOverrides | undefined,
  effectiveCount: number
): ShortcutRowStatus {
  const override = overrides?.[id]
  const modified = override !== undefined
  // `[]` is the disable sentinel and it is the ONLY thing that reads as disabled. A row with no
  // override and no default (fitAll) is unassigned, not disabled: the difference is whether the
  // user turned it off or nobody ever gave it a chord, and Reset only makes sense for the former.
  const disabled = modified && override.length === 0
  return { modified, disabled, unassigned: effectiveCount === 0 && !disabled }
}

export function rowPassesStatus(
  status: ShortcutRowStatus,
  filter: ShortcutStatusFilter
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'modified':
      return status.modified
    case 'unassigned':
      return status.unassigned
    case 'disabled':
      return status.disabled
  }
}

/** Every Windows spelling of one binding a query may use: the compact run (`CtrlShiftK`) and the
 *  displayed plus join (`Ctrl+Shift+K`). Separate haystack entries prevent a query from matching
 *  across the seam between two bindings. */
function chordSpellings(parts: readonly string[]): string[] {
  return [parts.join(''), parts.join('+')]
}

/**
 * Local search: case-insensitive substring match over the command's title, id, group, the
 * caller's keywords, and every effective binding's Windows display string in both spellings above.
 * An empty or whitespace-only query matches everything, matching `matchesQuery`'s contract in
 * `./search`.
 *
 * `chords` is `commandKeysFor(id)` output: display parts per effective binding, `[]` when unbound.
 */
export function matchesShortcutQuery(
  def: Pick<CommandDefinition, 'id' | 'title' | 'group'>,
  keywords: readonly string[],
  chords: readonly (readonly string[])[],
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const haystack = [
    def.title,
    def.id,
    def.group,
    ...keywords,
    ...chords.flatMap((parts) => chordSpellings(parts))
  ]
  return haystack.some((entry) => entry.toLowerCase().includes(q))
}
