import { describe, expect, it } from 'vitest'
import {
  COMMAND_DEFINITIONS,
  COMMANDS_BY_ID,
  getEffectiveBindings,
  normalizeBindingForCommand,
  bindingIdentity,
  sanitizeKeybindingOverrides,
  resolveCommandForKeyEvent
} from './keybindings'
import type { CommandId } from './keybindings'

const command = (id: CommandId) => {
  const value = COMMANDS_BY_ID.get(id)
  if (!value) throw new Error(`missing command ${id}`)
  return value
}

describe('Windows keybinding registry', () => {
  it('has unique ids and explicit Windows defaults', () => {
    const ids = COMMAND_DEFINITIONS.map((definition) => definition.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(COMMANDS_BY_ID.size).toBe(ids.length)
    for (const definition of COMMAND_DEFINITIONS) {
      expect(Array.isArray(definition.defaultBindings)).toBe(true)
      expect(definition.defaultBindings.join(' ')).not.toMatch(/Meta|Super/i)
    }
  })

  it('ships the expected Windows defaults', () => {
    expect(getEffectiveBindings('app.commandPalette', {})).toEqual(['Ctrl+K'])
    expect(getEffectiveBindings('node.close', {})).toEqual(['Ctrl+W'])
    expect(getEffectiveBindings('canvas.redo', {})).toEqual(['Ctrl+Shift+Z', 'Ctrl+Y'])
    expect(getEffectiveBindings('terminal.copySelection', {})).toEqual([
      'Ctrl+C',
      'Ctrl+Shift+C',
      'Ctrl+Insert'
    ])
  })

  it('normalizes and validates Windows bindings', () => {
    expect(normalizeBindingForCommand(command('node.newTerminal'), 'shift+t+ctrl')).toEqual({
      ok: true,
      value: 'Ctrl+Shift+T'
    })
    expect(normalizeBindingForCommand(command('node.newTerminal'), 'Shift+T').ok).toBe(false)
    expect(normalizeBindingForCommand(command('canvas.deleteSelection'), 'Delete')).toEqual({
      ok: true,
      value: 'Delete'
    })
  })

  it('keeps override sanitization and conflict identity deterministic', () => {
    const result = sanitizeKeybindingOverrides({
      'app.commandPalette': ['Ctrl+K'],
      'node.newTerminal': ['Ctrl+K']
    })
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(bindingIdentity('Control+K')).toBe(bindingIdentity('Ctrl+K'))
  })

  it('resolves the command palette shortcut on Windows', () => {
    expect(
      resolveCommandForKeyEvent(
        { key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
        { typing: false, terminal: false, kanbanOpen: false, terminalFirst: false },
        {}
      )
    ).toBe('app.commandPalette')
  })
})
