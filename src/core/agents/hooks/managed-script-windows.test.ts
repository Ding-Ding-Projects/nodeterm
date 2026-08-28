import { afterEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage } from 'node:http'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildManagedWindowsScript, buildWindowsManagedHookCommand } from './managed-script-windows'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

describe('Windows managed hook script', () => {
  it('uses native PowerShell and quotes an apostrophe in the script path', () => {
    const command = buildWindowsManagedHookCommand("C:\\Users\\O'Brien\\agent-hooks\\claude.ps1")
    expect(command).toContain('powershell.exe')
    const encoded = command.split(' ').at(-1)
    expect(encoded).toBeTruthy()
    const body = Buffer.from(encoded!, 'base64').toString('utf16le')
    expect(body).toContain("O''Brien")
    expect(body).toContain('[Console]::In.ReadToEnd()')
    expect(command).not.toContain('/bin/sh')
  })

  it.skipIf(process.platform !== 'win32')(
    'posts the payload and credentials to a real loopback receiver',
    async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'nodeterm-hook-win-'))
      roots.push(root)
      const tokenDir = path.join(root, 'node tokens')
      mkdirSync(tokenDir, { recursive: true })
      writeFileSync(path.join(tokenDir, 'node-1'), 'node-token\n', 'utf8')

      let received:
        | { body: URLSearchParams; hookToken?: string; nodeToken?: string; revision?: string }
        | undefined
      const server = createServer(async (request, response) => {
        received = {
          body: new URLSearchParams(await readBody(request)),
          hookToken: request.headers['x-nodeterm-hook-token'] as string | undefined,
          nodeToken: request.headers['x-nodeterm-node-token'] as string | undefined,
          revision: request.headers['x-nodeterm-hook-client'] as string | undefined
        }
        response.writeHead(204)
        response.end()
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('missing loopback address')

      const endpoint = path.join(root, 'hook-endpoint.env')
      writeFileSync(
        endpoint,
        [
          `NODETERM_HOOK_PORT='${address.port}'`,
          "NODETERM_HOOK_TOKEN='hook-token'",
          "NODETERM_HOOK_VERSION='2'",
          `NODETERM_NODE_TOKEN_DIR='${tokenDir}'`
        ].join('\n') + '\n',
        'utf8'
      )
      const script = path.join(root, 'claude.ps1')
      writeFileSync(script, buildManagedWindowsScript('claude'), 'utf8')

      const payload = JSON.stringify({ hook_event_name: 'Stop', message: 'finished' })
      const command = buildWindowsManagedHookCommand(script)
      const child = spawn(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', command],
        {
          env: {
            ...process.env,
            NODETERM_NODE_ID: 'node-1',
            NODETERM_HOOK_ENDPOINT: endpoint,
            NODETERM_NODE_TOKEN_DIR: tokenDir,
            USERPROFILE: root,
            APPDATA: path.join(root, 'AppData', 'Roaming')
          },
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )
      child.stdin.end(payload)
      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += String(chunk) })
      const exitCode = await new Promise<number | null>((resolve) => child.on('close', resolve))
      await new Promise<void>((resolve) => server.close(() => resolve()))

      expect(exitCode, stderr).toBe(0)
      expect(received?.hookToken).toBe('hook-token')
      expect(received?.nodeToken).toBe('node-token')
      expect(received?.revision).toMatch(/^\d+$/)
      expect(received?.body.get('nodeId')).toBe('node-1')
      expect(received?.body.get('version')).toBe('2')
      expect(received?.body.get('payload')).toBe(payload)
    },
    15_000
  )

  it.skipIf(process.platform !== 'win32')(
    'returns a Claude permission decision through the pending-file contract',
    async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'nodeterm-hook-permission-win-'))
      roots.push(root)
      const tokenDir = path.join(root, 'node-tokens')
      mkdirSync(tokenDir, { recursive: true })
      writeFileSync(path.join(tokenDir, 'node-2'), 'node-token\n', 'utf8')

      const requests: URLSearchParams[] = []
      const server = createServer(async (request, response) => {
        const body = new URLSearchParams(await readBody(request))
        requests.push(body)
        response.writeHead(204)
        response.end()
        const pendingId = body.get('nodeterm_pending_id')
        if (pendingId && !body.get('nodeterm_answered')) {
          const pendingDir = path.join(root, '.nodeterm', 'pending')
          mkdirSync(pendingDir, { recursive: true })
          writeFileSync(path.join(pendingDir, `${pendingId}.answer`), 'allow\n', 'utf8')
        }
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('missing loopback address')

      const endpoint = path.join(root, 'hook-endpoint.env')
      writeFileSync(
        endpoint,
        [
          `NODETERM_HOOK_PORT='${address.port}'`,
          "NODETERM_HOOK_TOKEN='hook-token'",
          "NODETERM_HOOK_VERSION='2'",
          `NODETERM_NODE_TOKEN_DIR='${tokenDir}'`
        ].join('\n') + '\n',
        'utf8'
      )
      const script = path.join(root, 'claude.ps1')
      writeFileSync(script, buildManagedWindowsScript('claude'), 'utf8')
      const powershell = path.join(
        process.env.WINDIR ?? 'C:\\Windows',
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe'
      )
      const payload = JSON.stringify({ hook_event_name: 'PermissionRequest', tool_name: 'Edit' })
      const child = spawn(
        powershell,
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
        {
          env: {
            ...process.env,
            NODETERM_NODE_ID: 'node-2',
            NODETERM_HOOK_ENDPOINT: endpoint,
            NODETERM_NODE_TOKEN_DIR: tokenDir,
            NODETERM_PERM_WAIT_SECS: '3',
            USERPROFILE: root,
            APPDATA: path.join(root, 'AppData', 'Roaming')
          },
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )
      child.stdin.end(payload)
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => { stdout += String(chunk) })
      child.stderr.on('data', (chunk) => { stderr += String(chunk) })
      const exitCode = await new Promise<number | null>((resolve) => child.on('close', resolve))
      await new Promise<void>((resolve) => server.close(() => resolve()))

      expect(exitCode, stderr).toBe(0)
      expect(JSON.parse(stdout.trim())).toEqual({
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: { behavior: 'allow' }
        }
      })
      expect(requests).toHaveLength(2)
      expect(requests[0].get('nodeterm_pending_id')).not.toBe('')
      expect(requests[1].get('nodeterm_answered')).toBe('allow')
    },
    15_000
  )
})
