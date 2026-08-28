import { isAbsolute } from 'path'

/** Electron's Windows clipboard format for a CF_HDROP file list. */
export const FILE_LIST_CLIPBOARD_TYPE = 'FileNameW'
const MAX_CLIPBOARD_FILES = 64

export interface FileClipboardDependencies {
  platform: string
  isFile(path: string): boolean
  writeBuffer(format: string, buffer: Buffer): void
}

/** Build the native Windows DROPFILES structure with a UTF-16LE double-null path list. */
export function fileListDropFiles(paths: string[]): Buffer {
  const names = `${paths.join('\0')}\0\0`
  const nameBytes = Buffer.from(names, 'utf16le')
  const header = Buffer.alloc(20)
  header.writeUInt32LE(20, 0)
  header.writeInt32LE(0, 4)
  header.writeInt32LE(0, 8)
  header.writeUInt32LE(0, 12)
  header.writeUInt32LE(1, 16)
  return Buffer.concat([header, nameBytes])
}

/** Put existing local regular files on the Windows clipboard as Explorer file references. */
export function writeFilesToClipboard(
  input: unknown,
  dependencies: FileClipboardDependencies
): boolean {
  if (dependencies.platform !== 'win32' || !Array.isArray(input)) return false

  const paths: string[] = []
  const seen = new Set<string>()
  for (const value of input) {
    if (typeof value !== 'string' || !isAbsolute(value)) return false
    if (seen.has(value)) continue
    if (paths.length >= MAX_CLIPBOARD_FILES) return false
    try {
      if (!dependencies.isFile(value)) return false
    } catch {
      return false
    }
    seen.add(value)
    paths.push(value)
  }
  if (!paths.length) return false

  try {
    dependencies.writeBuffer(FILE_LIST_CLIPBOARD_TYPE, fileListDropFiles(paths))
    return true
  } catch {
    return false
  }
}
