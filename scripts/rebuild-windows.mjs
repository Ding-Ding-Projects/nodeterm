import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const vswhere = join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft Visual Studio', 'Installer', 'vswhere.exe')
if (!existsSync(vswhere)) throw new Error(`vswhere.exe was not found at ${vswhere}`)

const raw = execFileSync(vswhere, [
  '-nologo', '-products', '*', '-version', '[17,18)',
  '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
  '-format', 'json'
], { encoding: 'utf8' })
const instances = JSON.parse(raw)
const selected = instances.find((instance) => {
  const base = instance.resolvedInstallationPath || instance.installationPath
  if (!base) return false
  const toolRoot = join(base, 'VC', 'Tools', 'MSVC')
  return existsSync(toolRoot) && readdirSync(toolRoot, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() && existsSync(join(toolRoot, entry.name, 'lib', 'spectre', 'x64'))
  )
})
const installationPath = selected?.resolvedInstallationPath || selected?.installationPath
if (!installationPath) throw new Error('No VS 2022 installation with Spectre libraries was found')

const developerCommand = join(installationPath, 'Common7', 'Tools', 'VsDevCmd.bat')
const rebuildCommand = join(root, 'node_modules', '.bin', 'electron-rebuild.cmd')
const command = `call "${developerCommand}" -arch=x64 -host_arch=x64 && call "${rebuildCommand}" -f -w node-pty,smart-whisper`
const result = spawnSync(command, {
  cwd: root,
  shell: true,
  env: {
    ...process.env,
    GYP_MSVS_VERSION: '2022',
    npm_config_msvs_version: '2022',
    GYP_MSVS_OVERRIDE_PATH: installationPath
  },
  stdio: 'inherit'
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
