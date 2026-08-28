# Non-blocking notifications

## Behavior

nodeterm reports functional informational, success, warning, and error events without interrupting
the active terminal or canvas. Local producers use the `nodeterm:toast` event, and the canvas maps
that event into the existing non-blocking notification surface.

The remote check feed is more restricted. Only warning-level service notices may enter the internal
notification path. Informational and success items render nothing because displaying product news
on launch is unsolicited promotion. The former launch banner and mobile promotional modal have been
removed.

The mobile companion remains available from the user-initiated Phone settings and documentation.
First-run onboarding explains that the desktop application works fully without it and provides no
promotional download action.

## Configuration

No setting is required to suppress promotional startup content because that content is not rendered.
The existing notification settings continue to control operating-system notifications for agent
events. They do not re-enable remote product news.

## Failure modes

- If the remote feed is unavailable or malformed, no remote notification is shown.
- If local browser storage is unavailable, a warning may be reconsidered during a later poll, but
  the application remains usable.
- A remote informational or success item is ignored even when it carries a link.
- A warning event without a body uses its title as the complete message.

## Security and privacy

The renderer never opens a remote announcement URL automatically. Remote data is bounded and
sanitized by the main process before it reaches the renderer. Promotional feed items cannot create
buttons, overlays, dialogs, banners, or external navigation.

## Verification

Run the focused policy suite:

```powershell
npm exec vitest run src/renderer/components/AnnouncementBanner.test.tsx
```

The suite proves that informational and success items are refused, warning items become internal
notification payloads, the notifier renders no DOM surface, and delivered warning identifiers are
remembered. The negative regression temporarily permits informational items and must fail both the
policy and no-visual-surface assertions before the production condition is restored.
