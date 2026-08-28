# Release completeness audit

This is a hand-written, fail-closed inventory. `Verified` means implementation, documentation,
focused automated coverage, local build evidence, and the listed packaged proof exist. `Blocked`
means at least one required boundary is absent. A missing feature is never treated as not applicable
merely because another surface provides something similar.

Current verdict: the Windows platform-conversion slice is verified locally. Full product release
readiness is blocked by the absent product-wide features listed below.

## Windows conversion inventory

| Feature | Implementation | Documentation | Focused coverage | Built proof | Status |
| --- | --- | --- | --- | --- | --- |
| Fresh-install source build | `build.bat`, `download-dependencies.bat`, `scripts/bootstrap-windows-toolchain.ps1` | `docs/features/windows-one-click-build.md` | full suite, type checking, dependency readiness marker | `build.bat /s` produced all required `out/` files | Verified |
| Unsigned Squirrel.Windows installer | `build-installer.bat`, `package.json`, `scripts/verify-unsigned.ps1` | `README.md`, build article | package-output and unsigned checks | setup, `RELEASES`, and full package produced locally | Verified |
| Native Windows agent hooks | `src/core/agents/hooks/managed-script-windows.ts` | subsystem notes in `CLAUDE.md` | real `cmd.exe` wrapper, loopback receiver, headers, permission answer | included in the production main bundle | Verified |
| Control-first shortcuts | `src/shared/shortcut.ts`, `src/shared/keybindings.ts`, renderer consumers | `README.md`, `CLAUDE.md` | shortcut, dispatcher, recorder, menu, link, zoom, and project-jump suites | production renderer built | Verified |
| Windows palette and chrome | shared color tokens, frameless title bar, custom controls | `README.md`, `CLAUDE.md` | theme, title-bar, and renderer suites | packaged executable exposes the project icon | Verified |
| Retired-platform source removal | source, tests, docs, workflows, site, and evidence assets | this audit and handoff | tracked-source term and shortcut scans | package contains Windows target only | Verified |
| Reproducible line count | `scripts/count-lines.mjs` | changelog and release workflow | `scripts/count-lines.test.mjs` | release workflow attaches generated table | Verified locally |

## Product-wide release blockers

| Required feature | Current evidence | Missing boundary | Status |
| --- | --- | --- | --- |
| Local personal-vocabulary JSON upload | no implementation found | control, bounded schema, local cache, search, persistence, invalid-file refusal, built interaction | Blocked |
| App-logo customization | project icon generation only | preset and custom upload UI, bounded conversion, crop and fit controls, persistence, reset, built interaction | Blocked |
| Categorized local file converter | no implementation found | adapter registry, categories, bundled proof, queue, PDF tools, sandbox, output validation, built interaction | Blocked |
| Local Ollama suite manager | no implementation found | exhaustive catalog, hardware-fit evidence, pulls, chat, harness profiles, rollback, built interaction | Blocked |
| Complete regex workbench | basic searches exist | construction, explanation, profiling, debugging, per-search anchored builders, complete search inventory | Blocked |
| Language and funny-level controls | no complete three-mode implementation found | English, Cantonese, bilingual, two independent persisted funny levels, localized coverage | Blocked |
| Shared School mode | no implementation found | shared live state, rename, unlock, suppression rules, persistence, built interaction | Blocked |
| Narration and voice selection | speech dictation is input only | event narrator, per-language voice pickers, queue, rate, pitch, persistence, accessibility | Blocked |
| ADHD interface modes | descriptive audience copy only | focus, low stimulation, time awareness, one thing, momentum, persistence, built interaction | Blocked |
| Full per-element appearance editor | theme and project-color controls exist | every-element editor, full typography, layers, states, reset, history, built interaction | Blocked |
| Toy locks and authenticator | no complete implementation found | six policies, keypad, TOTP registration, QR, local authenticator, recovery, built interaction | Blocked |
| Local Git-backed history for all records | canvas undo is session state | isolated local history repository, browse, diff, restore, retention, redacted export | Blocked |
| Browser-extension download dialogs | no installed extension flow found | start decision, separate downloading surface, completion surface, three built captures | Blocked |
| Per-click built interaction ledger | isolated historic captures exist | complete target inventory, every-click semantic receipt, exact source and executable hashes | Blocked |
| Complete capture matrix and recording | partial historic captures exist | every surface and state, current README gallery, current screen recording, alt text and provenance | Blocked |
| Release-backed README scale estimate | committed line counter exists | published release count plus matching human-time estimate and arithmetic | Blocked |

## Verification recorded for the Windows slice

- `npm run typecheck`: passed.
- `npm test`: 592 files passed, 2 skipped; 7,714 tests passed, 49 skipped.
- `npx vitest run scripts/count-lines.test.mjs`: 6 passed.
- `build.bat /s`: passed and produced all required runnable outputs.
- `build-installer.bat /s`: passed and produced an unsigned Squirrel.Windows package set.
- ICO inspection: 7 frames at 16, 24, 32, 48, 64, 128, and 256 pixels.
- Associated-icon inspection: packaged app and setup both expose a 32 pixel icon.
- Tracked source scan: no active retired-platform names, shortcut glyphs, packaging paths, or
  private conversational vocabulary. Exact cryptographic `MAC`, iOS App Store URLs, and
  `AppleWebKit` user-agent fixture text are retained because they are not retired desktop support.

## Release rule

The Windows conversion may be reviewed and integrated independently, but this audit must remain
`Blocked` for a full product release until every blocked row has implementation, documentation,
focused automated coverage, packaged interaction proof, and current real captures.
