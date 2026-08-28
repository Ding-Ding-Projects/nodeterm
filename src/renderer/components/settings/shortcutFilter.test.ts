import { describe, it, expect } from 'vitest'
import { COMMANDS_BY_ID, type KeybindingOverrides } from '@shared/keybindings'
import {
  matchesShortcutQuery,
  rowPassesStatus,
  shortcutRowStatus,
  type ShortcutStatusFilter
} from './shortcutFilter'

/** Real registry rows, so the pins below fail if the registry moves under them. */
const PALETTE = COMMANDS_BY_ID.get('app.commandPalette')!
const FIT_ALL = COMMANDS_BY_ID.get('canvas.fitAll')!
const UNDO = COMMANDS_BY_ID.get('canvas.undo')!
const COMMIT = COMMANDS_BY_ID.get('scm.commit')!

/** What `rowEntry` in ShortcutsSection feeds the matcher today. */
const KEYWORDS = ['shortcut', 'keybinding', 'hotkey', 'key']

describe('shortcutRowStatus', () => {
  it('is clean for a bound default with no override', () => {
    expect(shortcutRowStatus('canvas.undo', {}, 1)).toEqual({
      modified: false,
      disabled: false,
      unassigned: false
    })
  })

  it('treats a missing overrides map the same as an empty one', () => {
    expect(shortcutRowStatus('canvas.undo', undefined, 1)).toEqual({
      modified: false,
      disabled: false,
      unassigned: false
    })
  })

  it('is modified (only) when the id carries a non-empty override', () => {
    const overrides: KeybindingOverrides = { 'canvas.undo': ['Ctrl+Y'] }
    expect(shortcutRowStatus('canvas.undo', overrides, 1)).toEqual({
      modified: true,
      disabled: false,
      unassigned: false
    })
  })

  it('is modified AND disabled but NOT unassigned for an explicit [] override', () => {
    const overrides: KeybindingOverrides = { 'canvas.undo': [] }
    expect(shortcutRowStatus('canvas.undo', overrides, 0)).toEqual({
      modified: true,
      disabled: true,
      unassigned: false
    })
  })

  it('is unassigned but NOT modified for an unbound default (canvas.fitAll)', () => {
    expect(FIT_ALL.defaultBindings).toEqual([])
    expect(shortcutRowStatus('canvas.fitAll', {}, 0)).toEqual({
      modified: false,
      disabled: false,
      unassigned: true
    })
  })

  it('is modified AND unassigned when an override happens to leave zero bindings without being []', () => {
    // A sanitizer-shaped edge: the map has the id (so: modified) with a value that is not the
    // disable sentinel, yet nothing effective survives. It must not be reported as `disabled`.
    const overrides = { 'canvas.fitAll': ['Ctrl+Alt'] } as unknown as KeybindingOverrides
    expect(shortcutRowStatus('canvas.fitAll', overrides, 0)).toEqual({
      modified: true,
      disabled: false,
      unassigned: true
    })
  })

  it('reads only the queried id out of the map', () => {
    const overrides: KeybindingOverrides = { 'canvas.redo': [] }
    expect(shortcutRowStatus('canvas.undo', overrides, 1).modified).toBe(false)
  })
})

describe('rowPassesStatus', () => {
  const clean = { modified: false, disabled: false, unassigned: false }
  const modified = { modified: true, disabled: false, unassigned: false }
  const disabled = { modified: true, disabled: true, unassigned: false }
  const unassigned = { modified: false, disabled: false, unassigned: true }

  const table: Array<[string, typeof clean, Record<ShortcutStatusFilter, boolean>]> = [
    ['clean', clean, { all: true, modified: false, unassigned: false, disabled: false }],
    ['modified', modified, { all: true, modified: true, unassigned: false, disabled: false }],
    ['disabled', disabled, { all: true, modified: true, unassigned: false, disabled: true }],
    ['unassigned', unassigned, { all: true, modified: false, unassigned: true, disabled: false }]
  ]

  for (const [name, status, expected] of table) {
    for (const filter of ['all', 'modified', 'unassigned', 'disabled'] as ShortcutStatusFilter[]) {
      it(`${name} row under the '${filter}' filter -> ${expected[filter]}`, () => {
        expect(rowPassesStatus(status, filter)).toBe(expected[filter])
      })
    }
  }
})

describe('matchesShortcutQuery', () => {
  it('matches everything on an empty query', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], '')).toBe(true)
    expect(matchesShortcutQuery(FIT_ALL, [], [], '')).toBe(true)
  })

  it('matches everything on a whitespace-only query', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], '   ')).toBe(true)
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [], '\t\n ')).toBe(true)
  })

  it('matches the title case-insensitively', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'PALETTE')).toBe(true)
  })

  it('matches a partial title with surrounding whitespace trimmed', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], '  comm ')).toBe(true)
  })

  it('matches the command id', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'app.commandpalette')).toBe(true)
    expect(matchesShortcutQuery(UNDO, KEYWORDS, [['Ctrl', 'Z']], 'canvas.undo')).toBe(true)
  })

  it('matches the group even when no other field carries the word', () => {
    // `scm.commit` is deliberate: its group is 'Source Control' while its id says 'scm', so a
    // hit on "source" can only have come from the group field.
    expect(COMMIT.group).toBe('Source Control')
    expect(matchesShortcutQuery(COMMIT, [], [['Ctrl', 'Enter']], 'source')).toBe(true)
  })

  it('matches a supplied keyword that appears nowhere else', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'hotkey')).toBe(true)
  })

  it("finds the palette by the displayed plus join ('ctrl+k')", () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'ctrl+k')).toBe(true)
  })

  it("finds the palette by the compact Windows spelling ('ctrlk')", () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'ctrlk')).toBe(true)
  })

  it('matches a multi-modifier Windows chord in both supported spellings', () => {
    const parts = [['Ctrl', 'Shift', 'Alt', 'B']]
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, parts, 'ctrl+shift+alt+b')).toBe(true)
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, parts, 'ctrlshiftaltb')).toBe(true)
  })

  it('matches on the SECOND binding of a multi-chord command', () => {
    const chords = [['Delete'], ['Backspace']]
    expect(matchesShortcutQuery(UNDO, KEYWORDS, chords, 'backspace')).toBe(true)
  })

  it('does not match a chord the command does not hold', () => {
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'ctrl+j')).toBe(false)
    expect(matchesShortcutQuery(PALETTE, KEYWORDS, [['Ctrl', 'K']], 'ctrlj')).toBe(false)
  })

  it('returns false when nothing matches, including for an unbound row', () => {
    expect(matchesShortcutQuery(FIT_ALL, KEYWORDS, [], 'zzz')).toBe(false)
    expect(matchesShortcutQuery(FIT_ALL, KEYWORDS, [], 'fit all')).toBe(true)
  })

  it('tolerates an empty keyword list', () => {
    expect(matchesShortcutQuery(PALETTE, [], [['Ctrl', 'K']], 'palette')).toBe(true)
    expect(matchesShortcutQuery(PALETTE, [], [['Ctrl', 'K']], 'hotkey')).toBe(false)
  })

  it('does not bleed one binding into the next when matching a joined chord', () => {
    // Two separate single-key bindings must not answer to the concatenation of both.
    expect(matchesShortcutQuery(UNDO, [], [['A'], ['B']], 'ab')).toBe(false)
    // Nor to a query spanning the seam between two chord spellings of the same command.
    expect(matchesShortcutQuery(UNDO, [], [['Ctrl', 'K'], ['Ctrl', 'J']], 'ctrlk ctrlj')).toBe(false)
  })

  it('matches each field independently — a query may not span two fields', () => {
    // The haystack is a LIST, not one joined string: 'Undo canvas.undo' would match a naive
    // `.join(' ').includes(q)`, and so would a query straddling two keywords.
    expect(matchesShortcutQuery(UNDO, [], [], 'undo canvas.undo')).toBe(false)
    expect(matchesShortcutQuery(UNDO, ['alpha', 'beta'], [], 'alpha beta')).toBe(false)
  })

  it('matches a Windows chord case-insensitively', () => {
    expect(matchesShortcutQuery(UNDO, [], [['Ctrl', 'Z']], 'CTRL+Z')).toBe(true)
  })
})
