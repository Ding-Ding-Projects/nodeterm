# nodeterm.dev — landing page

Static landing page for [nodeterm.dev](https://nodeterm.dev). No build step — plain
HTML/CSS/JS. Deploy the contents of this folder to any static host (Netlify, Cloudflare
Pages, GitHub Pages, S3, Nginx, …).

```
site/
  index.html          landing page
  styles.css
  assets/             logo + hero illustration
  announcements.json  → served at /announcements.json (the in-app news feed)
  updates/            → served at /updates/ (the auto-update feed; binaries go here)
```

## How the download buttons work

`index.html` links to the Windows release page and documents the zero-setup source build. The
site does not publish or discover non-Windows packages.

## Two feeds this site serves

- **`/announcements.json`** — the in-app news banner reads this. Edit it to post news; see
  the schema in [`../docs/announcements.example.json`](../docs/announcements.example.json).
- **`/updates/`** — retained only for historical records. Current Windows distribution uses
  Squirrel.Windows release assets.

## Local preview

```bash
cd site && python3 -m http.server 8080   # → http://localhost:8080
```
