/**
 * Native Windows hook script generator. Local agent hooks run through Windows PowerShell 5.1,
 * which is present on a fresh supported installation. SSH and Server Edition hosts keep using
 * the POSIX generator in managed-script.ts.
 *
 * The script drains stdin before every exit, reads the live loopback endpoint from the file passed
 * in NODETERM_HOOK_ENDPOINT, presents the per-node capability without placing it on a command
 * line, posts a bounded form request, and implements Claude permission replies through the same
 * local pending-file contract as the POSIX hook.
 */

import { MANAGED_SCRIPT_REVISION } from './managed-script'

const WINDOWS_SCRIPT = String.raw`$ErrorActionPreference = 'Stop'

function Convert-EndpointValue([string]$Value) {
  $v = $Value.Trim()
  if ($v.Length -ge 2 -and $v[0] -eq [char]39 -and $v[$v.Length - 1] -eq [char]39) {
    $v = $v.Substring(1, $v.Length - 2)
    $needle = [string]::Concat([char]39, [char]34, [char]39, [char]34, [char]39)
    return $v.Replace($needle, [string][char]39)
  }
  if ($v.Length -ge 2 -and $v[0] -eq [char]34 -and $v[$v.Length - 1] -eq [char]34) {
    return $v.Substring(1, $v.Length - 2)
  }
  return $v
}

function Import-HookEndpoint([string]$Path) {
  $script:HookPort = ''
  $script:HookToken = ''
  $script:HookVersion = ''
  $script:NodeTokenDir = ''
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $false
  }
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    if ($line -notmatch '^([A-Z0-9_]+)=(.*)$') { continue }
    $value = Convert-EndpointValue $Matches[2]
    switch ($Matches[1]) {
      'NODETERM_HOOK_PORT' { $script:HookPort = $value }
      'NODETERM_HOOK_TOKEN' { $script:HookToken = $value }
      'NODETERM_HOOK_VERSION' { $script:HookVersion = $value }
      'NODETERM_NODE_TOKEN_DIR' { $script:NodeTokenDir = $value }
    }
  }
  $portNumber = 0
  return [int]::TryParse($script:HookPort, [ref]$portNumber) -and $portNumber -ge 1 -and $portNumber -le 65535
}

function Read-NodeToken([string]$EndpointPath) {
  $dirs = [System.Collections.Generic.List[string]]::new()
  if (-not [string]::IsNullOrWhiteSpace($script:NodeTokenDir)) { $dirs.Add($script:NodeTokenDir) }
  if (-not [string]::IsNullOrWhiteSpace($env:NODETERM_NODE_TOKEN_DIR)) { $dirs.Add($env:NODETERM_NODE_TOKEN_DIR) }
  if (-not [string]::IsNullOrWhiteSpace($EndpointPath)) {
    $dirs.Add((Join-Path (Split-Path -Parent $EndpointPath) 'node-tokens'))
  }
  if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
    $dirs.Add((Join-Path $env:USERPROFILE '.nodeterm\node-tokens'))
    $dirs.Add((Join-Path $env:USERPROFILE '.nodeterm-server\node-tokens'))
  }
  if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
    $dirs.Add((Join-Path $env:APPDATA 'node-terminal\node-tokens'))
  }
  foreach ($dir in $dirs) {
    if ([string]::IsNullOrWhiteSpace($dir)) { continue }
    $file = Join-Path $dir $env:NODETERM_NODE_ID
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
    $line = [System.IO.File]::ReadLines($file) | Select-Object -First 1
    if (-not [string]::IsNullOrWhiteSpace($line)) { return $line.Trim() }
  }
  return ''
}

function Send-Hook([string]$Payload, [string]$PendingId, [string]$Answered) {
  $candidates = [System.Collections.Generic.List[string]]::new()
  if (-not [string]::IsNullOrWhiteSpace($env:NODETERM_HOOK_ENDPOINT)) {
    $candidates.Add($env:NODETERM_HOOK_ENDPOINT)
  }
  if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
    $candidates.Add((Join-Path $env:APPDATA 'node-terminal\hook-endpoint.env'))
  }
  if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
    $candidates.Add((Join-Path $env:USERPROFILE '.nodeterm-server\hook-endpoint.env'))
  }

  $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($endpoint in $candidates) {
    if ([string]::IsNullOrWhiteSpace($endpoint) -or -not $seen.Add($endpoint)) { continue }
    if (-not (Import-HookEndpoint $endpoint)) { continue }
    $nodeToken = Read-NodeToken $endpoint
    $client = [System.Net.Http.HttpClient]::new()
    try {
      $client.Timeout = [TimeSpan]::FromMilliseconds(1500)
      if (-not [string]::IsNullOrWhiteSpace($script:HookToken)) {
        [void]$client.DefaultRequestHeaders.TryAddWithoutValidation('X-Nodeterm-Hook-Token', $script:HookToken)
      }
      if (-not [string]::IsNullOrWhiteSpace($nodeToken)) {
        [void]$client.DefaultRequestHeaders.TryAddWithoutValidation('X-Nodeterm-Node-Token', $nodeToken)
      }
      [void]$client.DefaultRequestHeaders.TryAddWithoutValidation('X-Nodeterm-Hook-Client', '__REVISION__')
      $form = [System.Collections.Generic.Dictionary[string,string]]::new()
      $form['nodeId'] = $env:NODETERM_NODE_ID
      $form['version'] = $script:HookVersion
      $form['payload'] = $Payload
      $form['nodeterm_pending_id'] = $PendingId
      if (-not [string]::IsNullOrWhiteSpace($Answered)) { $form['nodeterm_answered'] = $Answered }
      $content = [System.Net.Http.FormUrlEncodedContent]::new($form)
      try {
        $response = $client.PostAsync('http://127.0.0.1:' + $script:HookPort + '/hook/__AGENT__', $content).GetAwaiter().GetResult()
        if ($response.IsSuccessStatusCode) { return $true }
      } finally {
        $content.Dispose()
      }
    } catch {
    } finally {
      $client.Dispose()
    }
  }
  return $false
}

try {
  Add-Type -AssemblyName System.Net.Http -ErrorAction Stop
  $payload = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($env:NODETERM_NODE_ID) -or [string]::IsNullOrWhiteSpace($payload)) {
    exit 0
  }

  $pendingId = ''
  $pendingFile = ''
  $answerFile = ''
  $waitSeconds = 0
  $isPermissionRequest = $false
  if ('__AGENT__' -eq 'claude' -and [int]::TryParse($env:NODETERM_PERM_WAIT_SECS, [ref]$waitSeconds) -and $waitSeconds -gt 0) {
    try {
      $event = $payload | ConvertFrom-Json
      $isPermissionRequest = $event.hook_event_name -eq 'PermissionRequest'
    } catch {
      $isPermissionRequest = $false
    }
  }

  if ($isPermissionRequest) {
    $safeNode = $env:NODETERM_NODE_ID -replace '[^A-Za-z0-9_-]', '_'
    $pendingId = $safeNode + '-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '-' + $PID
    $pendingDir = Join-Path $env:USERPROFILE '.nodeterm\pending'
    [System.IO.Directory]::CreateDirectory($pendingDir) | Out-Null
    $pendingFile = Join-Path $pendingDir ($pendingId + '.json')
    $answerFile = Join-Path $pendingDir ($pendingId + '.answer')
    [System.IO.File]::WriteAllText($pendingFile, $payload, [System.Text.UTF8Encoding]::new($false))
  }

  [void](Send-Hook $payload $pendingId '')
  if (-not $isPermissionRequest) { exit 0 }

  $deadline = [DateTime]::UtcNow.AddSeconds($waitSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-Path -LiteralPath $answerFile -PathType Leaf) {
      $decision = ([System.IO.File]::ReadAllText($answerFile)).Trim().ToLowerInvariant()
      Remove-Item -LiteralPath $answerFile, $pendingFile -Force -ErrorAction SilentlyContinue
      if ($decision -eq 'allow' -or $decision -eq 'deny') {
        [void](Send-Hook $payload $pendingId $decision)
      }
      if ($decision -eq 'allow') {
        [Console]::Out.WriteLine('{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}')
      } elseif ($decision -eq 'deny') {
        [Console]::Out.WriteLine('{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"deny","message":"Denied from nodeterm."}}}')
      }
      exit 0
    }
    Start-Sleep -Milliseconds 500
  }
  Remove-Item -LiteralPath $pendingFile -Force -ErrorAction SilentlyContinue
} catch {
}
exit 0
`

export function buildManagedWindowsScript(agentId: string): string {
  if (!/^[a-z0-9-]+$/i.test(agentId)) throw new Error('Invalid hook agent id')
  return WINDOWS_SCRIPT
    .replaceAll('__AGENT__', agentId)
    .replaceAll('__REVISION__', String(MANAGED_SCRIPT_REVISION))
    .replace(/\n/g, '\r\n')
}

/** A guarded command suitable for Windows agent hook configuration. */
export function buildWindowsManagedHookCommand(scriptPath: string): string {
  const quoted = `'${scriptPath.replaceAll("'", "''")}'`
  // Encode the command so cmd.exe never has to interpret the path or PowerShell syntax. This is
  // especially important for user-profile paths containing apostrophes, ampersands, or parentheses.
  const body =
    `$p=${quoted}; if (Test-Path -LiteralPath $p -PathType Leaf) { & $p } ` +
    'else { [void][Console]::In.ReadToEnd() }; exit 0'
  const encoded = Buffer.from(body, 'utf16le').toString('base64')
  return `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`
}
