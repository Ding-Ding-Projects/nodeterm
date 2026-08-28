/** Windows Agent HUD settings surface. */
import { useSettings } from '../../../state/settings'
import { SettingsSection } from '../SettingsSection'
import { SearchableRow } from '../SearchableRow'
import { FieldRow } from '../FieldRow'
import { Switch } from '@renderer/ui/Switch'

/** Keep in sync with HUD_WIDTH_MIN/MAX in the main-process HUD controller. */
const WIDTH_MIN = 100
const WIDTH_MAX = 320

const ROWS = {
  enabled: {
    title: 'Agent HUD',
    keywords: ['agent', 'hud', 'mascot', 'taskbar', 'overlay', 'status', 'work area', 'floating panel']
  },
  width: {
    title: 'HUD width',
    keywords: ['hud', 'width', 'align', 'panel', 'position', 'offset', 'tune']
  },
  hover: {
    title: 'Expand on hover',
    keywords: ['hud', 'hover', 'expand', 'panel', 'click', 'open', 'sessions']
  }
}
const ENTRIES = Object.values(ROWS)

/**
 * Settings → Interface → Agent HUD, the Windows work-area activity surface.
 *
 * Everything the Agent HUD exposes lives here rather than in Appearance: the enable toggle, the
 * width control, and hover-vs-click expansion. All three apply
 * live: dragging the width slider resizes the surface as you drag.
 */
export function AgentHudSection({ isActive }: { isActive: boolean }): React.JSX.Element {
  const agentHud = useSettings((s) => s.settings.agentHud)
  const agentHudWidth = useSettings((s) => s.settings.agentHudWidth)
  const hoverExpand = useSettings((s) => s.settings.agentHudHoverExpand)
  const update = useSettings((s) => s.update)
  return (
    <SettingsSection
      id="agent-hud"
      title="Agent HUD"
      description="A Windows work-area activity surface with agent indicators and a compact session panel."
      isActive={isActive}
      searchEntries={ENTRIES}
    >
      <SearchableRow {...ROWS.enabled}>
        <FieldRow
          label="Show the Agent HUD"
          description="Shows a floating top-edge capsule while agents work: a walking mascot per busy agent, a red dot when one needs you, and a green mark when one has finished and you have not looked yet."
          control={
            <Switch
              checked={agentHud}
              ariaLabel="Agent HUD"
              onChange={(on) => update({ agentHud: on })}
            />
          }
        />
      </SearchableRow>

      <div
        className={
          'mt-3 space-y-3 border-l border-border pl-4' +
          (agentHud ? '' : ' pointer-events-none opacity-40')
        }
        aria-disabled={!agentHud}
      >
        <SearchableRow {...ROWS.width}>
          <FieldRow
            label="HUD width"
            description="Set the width of the compact Windows activity surface."
            control={
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={WIDTH_MIN}
                  max={WIDTH_MAX}
                  step={2}
                  value={agentHudWidth}
                  aria-label="Agent HUD width in pixels"
                  onChange={(e) => update({ agentHudWidth: Number(e.target.value) })}
                  className="w-40 accent-[var(--accent)]"
                />
                <span className="w-12 text-right text-[12px] text-muted tabular-nums">
                  {agentHudWidth} px
                </span>
              </div>
            }
          />
        </SearchableRow>

        <SearchableRow {...ROWS.hover}>
          <FieldRow
            label="Expand on hover"
            description="Point at the capsule to open the session panel. Off = it only opens when you click it. Either way it closes when you move away — and that's when a finished session stops glowing green."
            control={
              <Switch
                checked={hoverExpand}
                ariaLabel="Expand the Agent HUD on hover"
                onChange={(on) => update({ agentHudHoverExpand: on })}
              />
            }
          />
        </SearchableRow>
      </div>
    </SettingsSection>
  )
}
