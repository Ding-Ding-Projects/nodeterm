# One-click Windows build

The root `build.bat` is the supported path from a repository ZIP to a runnable Windows build. A
person may download the ZIP, extract it, and double-click the batch file without first installing a
runtime, SDK, compiler, package manager, or project package.

## Behavior

An interactive run requests administrator approval before any toolchain work begins. The elevated
copy then calls `download-dependencies.bat`, builds the production application, verifies the main,
preload, renderer, and session-host outputs, and asks whether to launch the result.

The bootstrap installs only missing components:

- Node.js 24.19.0 as a portable per-user toolchain;
- Python 3.12.10 in its standard per-user installation directory;
- Visual Studio Build Tools 2022 with the C++ workload;
- npm packages from `package-lock.json`.

Node, Python, and the Visual Studio bootstrapper come from their official publishers. Their exact
versions, URLs, and SHA-256 values live in `dependencies.manifest.json`. Every downloaded file is
hashed before extraction or execution.

## Installer build

`build-installer.bat` follows the same bootstrap path and then runs the supported Squirrel.Windows
packaging command. It requires all of the following before reporting success:

- `Setup.exe` exists;
- `RELEASES` exists and references the full package;
- the full `.nupkg` exists;
- Authenticode reports `NotSigned`, because code signing is intentionally prohibited;
- a SHA-256 digest and byte count can be calculated for the setup executable.

The scripts build locally only. They do not publish, create a release, create a tag, or alter a
remote repository.

## Silent mode

`/s`, `--silent`, and `SILENT=1` disable prompts and launch actions. Silent mode never opens UAC.
On a completely fresh machine it must therefore be started from an already elevated process so the
machine-wide C++ workload can be installed. User-scoped Node and Python setup remains unattended.

Examples:

```bat
build.bat /s
build-installer.bat /s
download-dependencies.bat /s
```

## Idempotence and locations

Portable toolchain files live below:

```text
%LOCALAPPDATA%\nodeterm\toolchain
```

Warm runs verify and reuse those files. `scripts/check-dependencies-ready.mjs` binds the npm package
readiness marker to the current `package-lock.json`, so a lockfile change causes a fresh `npm ci`.
Generated toolchains and packages are not committed.

## Failure modes

- A declined interactive UAC prompt returns nonzero before toolchain work.
- A download failure names the declared official URL.
- A digest mismatch deletes the downloaded temporary file and stops before execution.
- A malformed archive stops when the expected executable is absent.
- A Python or Node version mismatch stops after installation verification.
- Missing C++ tools in silent, unelevated mode report the required elevated rerun.
- A package install or build error preserves its actual exit code.
- A missing production output prevents the build from reporting success.
- A signed installer is rejected because signing is outside this project's policy.

## Security boundaries

The bootstrap does not install credentials, signing material, or secrets. It does not change the
persistent PowerShell execution policy. Local PowerShell helpers run with a per-process
`-ExecutionPolicy Bypass`. Recursive output removal validates that the resolved target remains
inside the extracted repository before deletion.

## Verification

The smallest local verification sequence is:

```bat
download-dependencies.bat /s
build.bat /s
build-installer.bat /s
```

For the true first-run proof, use a fresh Windows environment or extracted ZIP with no project
packages and no nodeterm toolchain cache. The expected result is a runnable `out/` tree and, for the
installer path, a validated unsigned Squirrel.Windows package set under `dist/squirrel-windows/`.
