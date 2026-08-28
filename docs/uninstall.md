# Uninstalling nodeterm on Windows

The supported desktop package uses Squirrel.Windows. The root [`uninstall.bat`](../uninstall.bat)
script locates the installed Squirrel `Update.exe`, invokes its real uninstall path, and keeps user
data unless removal is explicitly requested.

## One-click removal

Double-click `uninstall.bat` from an extracted repository ZIP. The script shows the discovered
uninstaller and asks before making a change.

For automation:

```bat
uninstall.bat --dry-run
uninstall.bat /s
uninstall.bat /s --purge
```

- `--dry-run` prints the plan and changes nothing.
- `/s` or `--silent` suppresses prompts and asks Squirrel to uninstall silently.
- `--purge` additionally removes nodeterm-owned local application data.
- `SILENT=1` is accepted as the environment equivalent of `/s`.

The script checks these supported Squirrel locations:

```text
%LOCALAPPDATA%\nodeterm\Update.exe
%LOCALAPPDATA%\node-terminal\Update.exe
%LOCALAPPDATA%\Programs\nodeterm\Update.exe
```

The current package installs under `%LOCALAPPDATA%\node-terminal`; the additional locations keep
the removal path tolerant of earlier package identities.

## Data retained by default

Ordinary uninstall removes the installed application and keeps user data. This allows a reinstall
to recover settings and local work.

`--purge` removes only these explicit nodeterm-owned directories:

```text
%APPDATA%\nodeterm
%USERPROFILE%\.nodeterm
%LOCALAPPDATA%\nodeterm
%LOCALAPPDATA%\node-terminal
%LOCALAPPDATA%\Programs\nodeterm
```

The script does not search the drive, delete repository checkouts, remove project-owned
`.nodeterm` directories, alter unrelated development tools, or contact a network service.

## Linux Server Edition

The Linux Server Edition remains a separate systemd deployment. Its cleanup and agent-integration
reversal live in [`scripts/uninstall.sh`](../scripts/uninstall.sh). That shell script is not used by
the Windows desktop package.

## Verification

The non-mutating contract check is:

```bat
uninstall.bat --dry-run --silent
```

A successful dry run reports the exact discovered Squirrel uninstaller or explains that no
recognized installation was found, then exits without changing files or processes.
