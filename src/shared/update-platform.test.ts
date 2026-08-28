import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  isManualUpdatePlatform,
  shouldEnableUpdater,
  toUpdateAvailablePayload
} from './update-platform'

describe('isManualUpdatePlatform', () => {
  it('linux with APPIMAGE set → auto (self-installs)', () => {
    expect(isManualUpdatePlatform('linux', true)).toBe(false)
  })

  it('linux without APPIMAGE → manual (.deb/.rpm)', () => {
    expect(isManualUpdatePlatform('linux', false)).toBe(true)
  })

  it('win32 → auto', () => {
    expect(isManualUpdatePlatform('win32', false)).toBe(false)
  })
})

describe('shouldEnableUpdater', () => {
  it('disables checks in development and in explicitly local packaged builds', () => {
    expect(shouldEnableUpdater(false, undefined)).toBe(false)
    expect(shouldEnableUpdater(true, 'disabled')).toBe(false)
  })

  it('keeps updater behavior unchanged for normal packaged releases', () => {
    expect(shouldEnableUpdater(true, undefined)).toBe(true)
    expect(shouldEnableUpdater(true, 'enabled')).toBe(true)
  })
})

/**
 * `shouldEnableUpdater` is only half the fix — it reads a marker the BUILD has to set. A `dist*`
 * script that forgets it produces a package indistinguishable from a release (`app.isPackaged` is
 * true for both), which then polls the production feed for a version nobody published and logs a
 * 404 on `latest*.yml` every six hours. That is a build-config mistake no unit test of the pure
 * function can catch, so assert it against the real package.json — the same guard-test shape as
 * `src/core/no-electron.test.ts`.
 */
describe('local dist scripts opt out of the production update feed', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')) as {
    build: { extraMetadata?: { nodeTermUpdates?: unknown } }
  }

  it('disables update polling for locally packaged builds through build metadata', () => {
    expect(pkg.build.extraMetadata?.nodeTermUpdates).toBe('disabled')
  })

  it('does not rely on a command-line config marker', () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    expect(Object.values(scripts.scripts).join('\n')).not.toContain('extraMetadata.nodeTermUpdates=disabled')
  })
})

describe('toUpdateAvailablePayload', () => {
  it('carries version + string release notes + manual flag', () => {
    expect(toUpdateAvailablePayload({ version: '1.2.0', releaseNotes: 'fixes' }, true)).toEqual({
      version: '1.2.0',
      notes: 'fixes',
      manual: true
    })
  })

  it('coerces non-string / missing release notes to empty string', () => {
    expect(toUpdateAvailablePayload({ version: '1.2.0' }, false)).toEqual({
      version: '1.2.0',
      notes: '',
      manual: false
    })
    expect(
      toUpdateAvailablePayload({ version: '1.2.0', releaseNotes: [{ note: 'x' }] }, false).notes
    ).toBe('')
  })
})
