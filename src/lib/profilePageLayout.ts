import type { Json } from '../types/database'

export type ProfileLayoutPreset = 'classic' | 'diary' | 'wide' | 'webring'
export type ProfileSidebarSide = 'left' | 'right'
export type ProfileHeroStyle = 'banner' | 'compact' | 'postcard'
export type ProfilePanelDensity = 'cozy' | 'compact' | 'roomy'
export type ProfileWidgetTitleStyle = 'solid' | 'underline' | 'tab' | 'pixel'
export type ProfileAvatarShape = 'circle' | 'square' | 'soft-square'
export type ProfileTabStyle = 'bar' | 'buttons'

export type ProfilePageLayout = {
  preset: ProfileLayoutPreset
  sidebarSide: ProfileSidebarSide
  heroStyle: ProfileHeroStyle
  panelDensity: ProfilePanelDensity
  widgetTitleStyle: ProfileWidgetTitleStyle
  avatarShape: ProfileAvatarShape
  tabStyle: ProfileTabStyle
  pageWidth: number
  contentGap: number
  borderWidth: number
  showSchoolIdentity: boolean
  showAboutCard: boolean
}

const fallback: ProfilePageLayout = {
  preset: 'classic',
  sidebarSide: 'left',
  heroStyle: 'banner',
  panelDensity: 'cozy',
  widgetTitleStyle: 'solid',
  avatarShape: 'circle',
  tabStyle: 'bar',
  pageWidth: 1120,
  contentGap: 14,
  borderWidth: 1,
  showSchoolIdentity: true,
  showAboutCard: true,
}

export const profileLayoutPresets: Record<ProfileLayoutPreset, ProfilePageLayout> = {
  classic: fallback,
  diary: {
    ...fallback,
    preset: 'diary',
    sidebarSide: 'right',
    heroStyle: 'postcard',
    panelDensity: 'compact',
    widgetTitleStyle: 'tab',
    avatarShape: 'soft-square',
    tabStyle: 'buttons',
    pageWidth: 980,
    contentGap: 10,
  },
  wide: {
    ...fallback,
    preset: 'wide',
    heroStyle: 'banner',
    panelDensity: 'roomy',
    widgetTitleStyle: 'underline',
    avatarShape: 'circle',
    pageWidth: 1320,
    contentGap: 18,
  },
  webring: {
    ...fallback,
    preset: 'webring',
    sidebarSide: 'right',
    heroStyle: 'compact',
    panelDensity: 'compact',
    widgetTitleStyle: 'pixel',
    avatarShape: 'square',
    tabStyle: 'buttons',
    pageWidth: 1060,
    contentGap: 8,
    borderWidth: 2,
  },
}

function objectFrom(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

function enumValue<T extends string>(value: Json | undefined, allowed: readonly T[], fallbackValue: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallbackValue
}

function numberValue(value: Json | undefined, minimum: number, maximum: number, fallbackValue: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, Math.round(value)))
    : fallbackValue
}

export function profilePageLayoutFrom(value: Json): ProfilePageLayout {
  const source = objectFrom(value)
  const preset = enumValue(source.layoutPreset, ['classic', 'diary', 'wide', 'webring'] as const, fallback.preset)
  const presetDefaults = profileLayoutPresets[preset]
  return {
    preset,
    sidebarSide: enumValue(source.sidebarSide, ['left', 'right'] as const, presetDefaults.sidebarSide),
    heroStyle: enumValue(source.heroStyle, ['banner', 'compact', 'postcard'] as const, presetDefaults.heroStyle),
    panelDensity: enumValue(source.panelDensity, ['cozy', 'compact', 'roomy'] as const, presetDefaults.panelDensity),
    widgetTitleStyle: enumValue(source.widgetTitleStyle, ['solid', 'underline', 'tab', 'pixel'] as const, presetDefaults.widgetTitleStyle),
    avatarShape: enumValue(source.avatarShape, ['circle', 'square', 'soft-square'] as const, presetDefaults.avatarShape),
    tabStyle: enumValue(source.tabStyle, ['bar', 'buttons'] as const, presetDefaults.tabStyle),
    pageWidth: numberValue(source.pageWidth, 860, 1440, presetDefaults.pageWidth),
    contentGap: numberValue(source.contentGap, 0, 28, presetDefaults.contentGap),
    borderWidth: numberValue(source.profilePanelBorderWidth, 1, 4, presetDefaults.borderWidth),
    showSchoolIdentity: typeof source.showSchoolIdentity === 'boolean' ? source.showSchoolIdentity : presetDefaults.showSchoolIdentity,
    showAboutCard: typeof source.showAboutCard === 'boolean' ? source.showAboutCard : presetDefaults.showAboutCard,
  }
}

export function profilePageLayoutPatch(layout: ProfilePageLayout): Record<string, Json> {
  return {
    layoutPreset: layout.preset,
    sidebarSide: layout.sidebarSide,
    heroStyle: layout.heroStyle,
    panelDensity: layout.panelDensity,
    widgetTitleStyle: layout.widgetTitleStyle,
    avatarShape: layout.avatarShape,
    tabStyle: layout.tabStyle,
    pageWidth: layout.pageWidth,
    contentGap: layout.contentGap,
    profilePanelBorderWidth: layout.borderWidth,
    showSchoolIdentity: layout.showSchoolIdentity,
    showAboutCard: layout.showAboutCard,
  }
}
