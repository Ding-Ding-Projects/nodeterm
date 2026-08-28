# Agent HUD contract

The Agent HUD is a Windows desktop activity surface. It is a frameless, transparent,
always-on-top, click-through tool window positioned against the primary display work area. It shows
agent activity without stealing focus from the terminal being used.

## Behavior

- The compact surface stays hidden while every tracked session is idle.
- Working agents show their project-appropriate mascot or mark.
- Finished but unread sessions show a completion indicator.
- Sessions needing attention show an attention indicator.
- Clicking the surface expands a session panel with bounded rows and honest overflow counts.
- Clicking a row restores and focuses the main window on the associated canvas node.
- Dismissing a row changes only the HUD presentation and does not close or alter the terminal.
- The panel receives live updates from the shared agent-status mirror and context stream.
- School mode and reduced-motion preferences are applied to the HUD like every other surface.

## Windows geometry

The controller reads the primary display work area, centers a bounded HUD window against its top
edge, and keeps the whole panel inside the available display. The renderer always uses the
standalone floating-pill layout. There is no physical-display cutout assumption and no platform
permission or administrator prompt.

The window uses Windows tool-window behavior: it does not appear in the taskbar or Alt+Tab list,
does not activate when shown, stays above normal windows, and forwards pointer movement while it is
click-through. The main application remains the focus owner until the user deliberately selects a
HUD row.

## Settings

The Settings page exposes the Agent HUD switch, bounded width control, hover expansion switch, and
the existing usage display mode. All values persist locally and apply live. The settings section is
available on the Windows desktop and is searchable through the settings search surface.

## Failure handling

Malformed status events are ignored by the HUD controller so they cannot crash the main process.
Missing or destroyed windows stop delivery safely. Display changes trigger bounded repositioning.
The HUD never claims a session is healthy based on a missing event, and it never changes terminal
state as a side effect of rendering an indicator.

## Verification

The built Windows application must be driven through the approved hidden-desktop route. Verification
covers startup, idle suppression, working, attention, completion, overflow, focus-to-node,
dismissal, live setting changes, display repositioning, reduced motion, keyboard access, and
shutdown. Captures and the interaction ledger identify the exact build commit and packaged output.
