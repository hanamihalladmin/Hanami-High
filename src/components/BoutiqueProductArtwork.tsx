import { BoutiqueArtworkV2 } from './BoutiqueArtworkV2'
import { BoutiqueOrnateArtwork, isOrnateBoutiqueName } from './BoutiqueOrnateArtwork'

type Props = {
  name: string
  type: string
  large?: boolean
  animated?: boolean
}

export function BoutiqueProductArtwork({ name, type, large = false, animated = false }: Props) {
  if (isOrnateBoutiqueName(name)) {
    return <BoutiqueOrnateArtwork name={name} type={type} large={large} animated={animated} />
  }

  return <BoutiqueArtworkV2 name={name} type={type} large={large} />
}
