import { projectSectionId } from './project-settings-targets'
import type { ProjectIcon } from '@shared/project-icon'

export type SettingsSectionId =
  | 'terminal'
  | 'shell'
  | 'behavior'
  | 'appearance'
  | 'agent-hud'
  | 'phone'
  | 'speech'
  | 'shortcuts'
  | 'agents'
  | 'usage'
  | 'accounts'
  | 'custom-agents'
  | 'model-gateway'
  | 'notifications'
  | 'commit'
  | 'tmux'
  | 'github-issues'
  | 'license'
  | 'presence'
  | 'remote'
  | 'team-access'
  | 'ssh'
  | 'updates'
  | 'privacy'
  | 'debug'
  | `project-${string}`

export interface ProjectNavItem {
  id: string
  name: string
  color: string
  icon?: ProjectIcon
}

export interface SettingsSectionRef {
  id: SettingsSectionId
  title: string
  /** Project-section rows only (`project-${string}` ids): the project's own color/icon, so the
   *  sidebar can render its `ProjectGlyph` beside the title instead of the generic folder glyph
   *  every project section used to share. Absent on every static section. */
  color?: string
  icon?: ProjectIcon
}

export interface SettingsGroup {
  id: string
  title: string
  sections: SettingsSectionRef[]
}

// Grouped by what the user is DOING, not by where the code lives: AI work first (it is what
// the app is for), then the workspace around it, then connectivity, then app housekeeping.
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'ai',
    title: 'AI capabilities',
    sections: [
      { id: 'agents', title: 'Agents' },
      { id: 'accounts', title: 'Accounts' },
      { id: 'custom-agents', title: 'Custom agents' },
      { id: 'model-gateway', title: 'Model gateway' },
      { id: 'usage', title: 'Usage' },
      { id: 'commit', title: 'Commit messages' }
    ]
  },
  {
    id: 'workspace',
    title: 'Workspace',
    sections: [
      { id: 'terminal', title: 'Terminal' },
      { id: 'shell', title: 'Shell' },
      { id: 'tmux', title: 'tmux' },
      { id: 'github-issues', title: 'GitHub Issues' },
      { id: 'behavior', title: 'Behavior' }
    ]
  },
  {
    id: 'interface',
    title: 'Interface',
    sections: [
      { id: 'appearance', title: 'Appearance' },
      { id: 'agent-hud', title: 'Agent HUD' },
      { id: 'notifications', title: 'Notifications' },
      { id: 'speech', title: 'Speech' },
      { id: 'shortcuts', title: 'Keyboard Shortcuts' }
    ]
  },
  {
    id: 'connectivity',
    title: 'Remote & team',
    sections: [
      { id: 'presence', title: 'Your name' },
      { id: 'phone', title: 'Phone' },
      { id: 'remote', title: 'Remote access' },
      { id: 'team-access', title: 'Team seats' },
      { id: 'ssh', title: 'Remote (SSH)' }
    ]
  },
  {
    id: 'application',
    title: 'Application',
    sections: [
      { id: 'license', title: 'License' },
      { id: 'updates', title: 'Updates' },
      { id: 'privacy', title: 'Privacy' },
      { id: 'debug', title: 'Debug' }
    ]
  }
]

export const FIRST_SECTION_ID: SettingsSectionId = 'agents'

export function allSectionIds(): SettingsSectionId[] {
  return SETTINGS_GROUPS.flatMap((g) => g.sections.map((s) => s.id))
}

/**
 * The groups as the sidebar should render them for the supported desktop and browser surfaces.
 */
export function visibleSettingsGroups(_usesMetaPrimary: boolean): SettingsGroup[] {
  return SETTINGS_GROUPS
}

/**
 * Render-time only — deliberately NOT part of `SETTINGS_GROUPS`. Open projects change at
 * runtime, so this builds a group from the current project list on every render instead of
 * baking project ids into the static nav (which would break the `nav.test.ts` section-count
 * pins). Returns null when there are no open projects, so callers can skip rendering the group.
 */
export function projectsSettingsGroup(projects: ProjectNavItem[]): SettingsGroup | null {
  if (projects.length === 0) return null
  return {
    id: 'projects',
    title: 'Projects',
    sections: projects.map((p) => ({
      id: projectSectionId(p.id),
      title: p.name,
      color: p.color,
      icon: p.icon
    }))
  }
}
