import type { CSSProperties } from 'react'
import type { Json } from '../types/database'

export type ProfileBackgroundMode = 'color' | 'gradient' | 'pattern' | 'image'
export type ProfileBackgroundRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
export type ProfileBackgroundSize = 'auto' | 'cover' | 'contain'
export type ProfileBackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right'
export type ProfileBackgroundAttachment = 'scroll' | 'fixed'
export type ProfilePattern = 'dots' | 'grid' | 'petals' | 'stripes' | 'gingham'

export type ProfilePageBackground = {
  mode: ProfileBackgroundMode
  color: string
  color2: string
  gradientAngle: number
  imagePath: string | null
  repeat: ProfileBackgroundRepeat
  size: ProfileBackgroundSize
  position: ProfileBackgroundPosition
  attachment: ProfileBackgroundAttachment
  pattern: ProfilePattern
  panelOpacity: number
  borderStyle: 'solid' | 'dotted' | 'dashed' | 'double'
}

const fallback: ProfilePageBackground = {
  mode: 'color',
  color: '#f4f0e8',
  color2: '#fdeef3',
  gradientAngle: 135,
  imagePath: null,
  repeat: 'repeat',
  size: 'auto',
  position: 'center',
  attachment: 'scroll',
  pattern: 'petals',
  panelOpacity: 0.96,
  borderStyle: 'double',
}

function objectFrom(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

function enumValue<T extends string>(value: Json | undefined, allowed: readonly T[], fallbackValue: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallbackValue
}

function colorValue(value: Json | undefined, fallbackValue: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackValue
}

export function profilePageBackgroundFrom(value: Json): ProfilePageBackground {
  const source = objectFrom(value)
  return {
    mode: enumValue(source.backgroundMode, ['color', 'gradient', 'pattern', 'image'] as const, fallback.mode),
    color: colorValue(source.background, fallback.color),
    color2: colorValue(source.backgroundColor2, fallback.color2),
    gradientAngle: typeof source.backgroundGradientAngle === 'number' ? Math.max(0, Math.min(360, source.backgroundGradientAngle)) : fallback.gradientAngle,
    imagePath: typeof source.backgroundImagePath === 'string' && source.backgroundImagePath.length > 0 ? source.backgroundImagePath : null,
    repeat: enumValue(source.backgroundRepeat, ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'] as const, fallback.repeat),
    size: enumValue(source.backgroundSize, ['auto', 'cover', 'contain'] as const, fallback.size),
    position: enumValue(source.backgroundPosition, ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'] as const, fallback.position),
    attachment: enumValue(source.backgroundAttachment, ['scroll', 'fixed'] as const, fallback.attachment),
    pattern: enumValue(source.backgroundPattern, ['dots', 'grid', 'petals', 'stripes', 'gingham'] as const, fallback.pattern),
    panelOpacity: typeof source.panelOpacity === 'number' ? Math.max(0.45, Math.min(1, source.panelOpacity)) : fallback.panelOpacity,
    borderStyle: enumValue(source.profileBorderStyle, ['solid', 'dotted', 'dashed', 'double'] as const, fallback.borderStyle),
  }
}

export function profilePageBackgroundPatch(background: ProfilePageBackground): Record<string, Json> {
  return {
    backgroundMode: background.mode,
    background: background.color,
    backgroundColor2: background.color2,
    backgroundGradientAngle: background.gradientAngle,
    backgroundImagePath: background.imagePath,
    backgroundRepeat: background.repeat,
    backgroundSize: background.size,
    backgroundPosition: background.position,
    backgroundAttachment: background.attachment,
    backgroundPattern: background.pattern,
    panelOpacity: background.panelOpacity,
    profileBorderStyle: background.borderStyle,
  }
}

function patternImage(pattern: ProfilePattern, color: string, accent: string) {
  if (pattern === 'dots') return `radial-gradient(circle, ${accent}55 1.5px, transparent 1.7px)`
  if (pattern === 'grid') return `linear-gradient(${accent}2c 1px, transparent 1px), linear-gradient(90deg, ${accent}2c 1px, transparent 1px)`
  if (pattern === 'stripes') return `repeating-linear-gradient(135deg, ${color} 0 12px, ${accent}26 12px 14px, ${color} 14px 26px)`
  if (pattern === 'gingham') return `linear-gradient(90deg, ${accent}20 50%, transparent 50%), linear-gradient(${accent}20 50%, transparent 50%)`
  return `radial-gradient(ellipse at 35% 35%, ${accent}45 0 2px, transparent 2.4px), radial-gradient(ellipse at 65% 65%, ${accent}30 0 1.5px, transparent 2px)`
}

export function profilePageBackgroundStyle(background: ProfilePageBackground, imageUrl: string | null, accent = '#d86f8b'): CSSProperties {
  const base: CSSProperties = {
    backgroundColor: background.color,
    backgroundPosition: background.position,
    backgroundAttachment: background.attachment,
  }

  if (background.mode === 'gradient') {
    return {
      ...base,
      backgroundImage: `linear-gradient(${background.gradientAngle}deg, ${background.color}, ${background.color2})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }
  }

  if (background.mode === 'pattern') {
    const sizes: Record<ProfilePattern, string> = { dots: '22px 22px', grid: '24px 24px', petals: '38px 38px', stripes: 'auto', gingham: '34px 34px' }
    return {
      ...base,
      backgroundImage: patternImage(background.pattern, background.color, accent),
      backgroundRepeat: 'repeat',
      backgroundSize: sizes[background.pattern],
    }
  }

  if (background.mode === 'image' && imageUrl) {
    return {
      ...base,
      backgroundImage: `url("${imageUrl.replaceAll('"', '%22')}")`,
      backgroundRepeat: background.repeat,
      backgroundSize: background.size,
    }
  }

  return base
}
