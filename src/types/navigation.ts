export type ShellSectionId =
  | 'home'
  | 'messages'
  | 'social'
  | 'academics'
  | 'campus'
  | 'profile'
  | 'discover'
  | 'petals'
  | 'boutique'
  | 'achievements'
  | 'settings'

export type RailItem = {
  id: ShellSectionId
  label: string
  icon: string
  badge?: string
}

export type SubsectionDefinition = {
  id: string
  label: string
  description: string
}

export type SectionDefinition = {
  id: ShellSectionId
  label: string
  eyebrow: string
  title: string
  icon: string
  group: 'primary' | 'rewards' | 'settings'
  defaultSubsection: string
  subsections: SubsectionDefinition[]
}

export type ShellRoute = {
  section: ShellSectionId
  subsection: string
  targetId?: string
}
