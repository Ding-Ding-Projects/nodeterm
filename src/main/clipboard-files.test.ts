import { describe, expect, it, vi } from 'vitest'
import {
  FILE_LIST_CLIPBOARD_TYPE,
  fileListDropFiles,
  writeFilesToClipboard,
  type FileClipboardDependencies
} from './clipboard-files'

const dependencies = (overrides: Partial<FileClipboardDependencies> = {}): FileClipboardDependencies => ({
  platform: 'win32',
  isFile: () => true,
  writeBuffer: vi.fn(),
  ...overrides
})

describe('writeFilesToClipboard', () => {
  it('writes a native Windows UTF-16 file list', () => {
    const deps = dependencies()
    expect(writeFilesToClipboard(['C:\\Users\\A & B\\one.txt', 'C:\\tmp\\two.txt'], deps)).toBe(true)
    const [format, buffer] = vi.mocked(deps.writeBuffer).mock.calls[0]
    expect(format).toBe(FILE_LIST_CLIPBOARD_TYPE)
    expect(buffer.readUInt32LE(0)).toBe(20)
    expect(buffer.readUInt32LE(16)).toBe(1)
    expect(buffer.toString('utf16le', 20)).toBe('C:\\Users\\A & B\\one.txt\0C:\\tmp\\two.txt\0\0')
  })

  it('rejects non-Windows platforms and invalid selections', () => {
    expect(writeFilesToClipboard(['C:\\tmp\\a'], dependencies({ platform: 'linux' }))).toBe(false)
    expect(writeFilesToClipboard(['C:\\tmp\\a'], dependencies({ isFile: () => false }))).toBe(false)
    expect(writeFilesToClipboard(['relative'], dependencies())).toBe(false)
    expect(writeFilesToClipboard('not-an-array', dependencies())).toBe(false)
  })

  it('keeps the bounded all-or-nothing selection contract', () => {
    const paths = (count: number): string[] => Array.from({ length: count }, (_, i) => `C:\\tmp\\f${i}`)
    expect(writeFilesToClipboard(paths(64), dependencies())).toBe(true)
    expect(writeFilesToClipboard(paths(65), dependencies())).toBe(false)
  })
})

describe('fileListDropFiles', () => {
  it('writes the required DROPFILES header and double terminator', () => {
    const data = fileListDropFiles(['C:\\a.txt'])
    expect(data.readUInt32LE(0)).toBe(20)
    expect(data.readUInt32LE(16)).toBe(1)
    expect(data.toString('utf16le', 20)).toBe('C:\\a.txt\0\0')
  })
})
