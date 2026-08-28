import { describe, expect, it } from 'vitest'
import { IPC } from '../shared/ipc'
import {
  closeStandsDownInTerminal,
  keydownIntercept,
  menuItemIdsToSuspend,
  menuStandsDown,
  navigationClearsRecording,
  policyStandsDown,
  resolveInterceptBindings
} from './keydown-intercept'

const input = (overrides: Partial<Parameters<typeof keydownIntercept>[0]> = {}) => ({
  type: 'keyDown' as const,
  key: '0',
  code: 'Digit0',
  meta: false,
  control: false,
  shift: false,
  alt: false,
  isAutoRepeat: false,
  ...overrides
})

const bindings = (overrides: unknown = undefined) => resolveInterceptBindings(overrides, false)

describe('Windows keydown interception', () => {
  it('forwards Ctrl+M and Ctrl+W to their renderer actions', () => {
    expect(keydownIntercept(input({ control: true, key: 'm', code: 'KeyM' }), bindings(), false)).toEqual({
      action: 'toggle-markdown'
    })
    expect(keydownIntercept(input({ control: true, key: 'w', code: 'KeyW' }), bindings(), false)).toEqual({
      action: 'close-node'
    })
  })

  it('forwards Ctrl+0 once and suppresses auto-repeat', () => {
    expect(keydownIntercept(input({ control: true }), bindings(), false)).toEqual({
      action: 'zoom-actual-size'
    })
    expect(keydownIntercept(input({ control: true, isAutoRepeat: true }), bindings(), false)).toEqual({
      action: null
    })
    expect(keydownIntercept(input(), bindings(), false)).toBeNull()
  })

  it('refuses extra modifiers and follows explicit remaps', () => {
    expect(keydownIntercept(input({ control: true, shift: true, key: 'm', code: 'KeyM' }), bindings(), false)).toBeNull()
    const remapped = bindings({ 'node.close': ['Ctrl+Shift+K'] })
    expect(keydownIntercept(input({ control: true, shift: true, key: 'K', code: 'KeyK' }), remapped, false)).toEqual({
      action: 'close-node'
    })
  })

  it('keeps the Windows close menu accelerator stood down in a focused terminal', () => {
    expect(closeStandsDownInTerminal(false, true)).toBe(true)
    expect(closeStandsDownInTerminal(false, false)).toBe(false)
    expect(menuItemIdsToSuspend(false)).toContain('window-close')
  })
})

describe('Windows shortcut lifecycle policy', () => {
  it('only stands down under terminal-first with a focused terminal', () => {
    expect(policyStandsDown('terminal-first', true)).toBe(true)
    expect(policyStandsDown('terminal-first', false)).toBe(false)
    expect(policyStandsDown('app-first', true)).toBe(false)
  })

  it('combines recording and policy stand-down without losing either condition', () => {
    expect(menuStandsDown(true, 'app-first', false)).toBe(true)
    expect(menuStandsDown(false, 'terminal-first', true)).toBe(true)
    expect(menuStandsDown(false, 'app-first', false)).toBe(false)
    expect(navigationClearsRecording({ isMainFrame: true, isSameDocument: false })).toBe(true)
    expect(navigationClearsRecording({ isMainFrame: true, isSameDocument: true })).toBe(false)
  })

  it('keeps the exported action identifiers stable', () => {
    expect(IPC.appCloseNode).toBe('app:close-node')
    expect(IPC.appToggleMarkdown).toBe('app:toggle-markdown')
  })
})
