const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

/**
 * Apply Windows executable resources without invoking a signer.
 *
 * electron-builder couples resource editing to its sign-and-edit control. That control remains
 * false under this project's permanent no-signing policy, so this hook runs the bundled rcedit
 * utility directly after the application directory is packed and before Squirrel consumes it.
 */
module.exports = async function applyUnsignedWindowsResources(context) {
  if (context.electronPlatformName !== 'win32') return

  const projectRoot = context.packager.projectDir
  const executableName = `${context.packager.appInfo.productFilename}.exe`
  const executable = path.join(context.appOutDir, executableName)
  const icon = path.join(projectRoot, 'build', 'icon.ico')
  const editor = path.join(
    projectRoot,
    'node_modules',
    'electron-winstaller',
    'vendor',
    'rcedit.exe'
  )
  for (const [label, file] of [['packed executable', executable], ['icon', icon], ['resource editor', editor]]) {
    if (!existsSync(file)) throw new Error(`Unsigned resource edit is missing ${label}: ${file}`)
  }

  const version = `${context.packager.appInfo.version}.0`
  execFileSync(editor, [
    executable,
    '--set-icon', icon,
    '--set-file-version', version,
    '--set-product-version', version,
    '--set-version-string', 'ProductName', context.packager.appInfo.productName,
    '--set-version-string', 'FileDescription', 'node-based terminal manager',
    '--set-version-string', 'InternalName', context.packager.appInfo.productFilename,
    '--set-version-string', 'OriginalFilename', executableName
  ], { stdio: 'inherit', windowsHide: true })
}
