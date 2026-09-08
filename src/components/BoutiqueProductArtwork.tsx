import { BoutiqueArtworkV2 } from './BoutiqueArtworkV2'
import { BoutiqueOrnateArtwork, isOrnateBoutiqueName } from './BoutiqueOrnateArtwork'

type Props = {
  name: string
  type: string
  large?: boolean
  animated?: boolean
}

const ornateThemeAliases: Record<string, string> = {
  'Golden Breath': 'Gilded Dragon · Golden Breath',
  'Sumi Ember': 'Ink Dragon · Sumi Ember',
  'Halo Waltz': 'Celestial Crown · Halo Waltz',
  'Frostwing Aura': 'Frost Feather · Frostwing Aura',
  'Roselight Veil': 'Roseglass Heart · Roselight Veil',
  'Moon Butterfly Glow': 'Moonlit Lace · Moon Butterfly Glow',
  'Petal Seraph Aura': 'Sakura Seraph · Petal Seraph Aura',
  'Witchlight Mist': 'Witching Hour · Witchlight Mist',
  'Lantern Orbit': 'Pumpkin Moon · Lantern Orbit',
  'Batwing Spark': 'Velvet Bat · Batwing Spark',
  'Familiar Ember': 'Crimson Familiar · Familiar Ember',
}

export function BoutiqueProductArtwork({ name, type, large = false, animated = false }: Props) {
  if (isOrnateBoutiqueName(name)) {
    return <BoutiqueOrnateArtwork name={ornateThemeAliases[name] ?? name} type={type} large={large} animated={animated} />
  }

  return <BoutiqueArtworkV2 name={name} type={type} large={large} />
}
