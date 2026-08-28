# /updates

This directory is a historical update-feed location served at `https://nodeterm.dev/updates/`.
Current desktop distribution uses Squirrel.Windows release assets from GitHub Releases.

Current Windows release output has this shape:

```
nodeterm-Setup-<version>.exe        # unsigned Squirrel.Windows installer
node-terminal-<version>-full.nupkg  # complete Squirrel.Windows package
RELEASES                             # Squirrel.Windows release index
```

These files are intentionally **not** committed to git (they are large binaries); deploy
them straight to the host.
