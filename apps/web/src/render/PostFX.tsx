import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useGame } from '../game/store';
import { Grade } from './GradeEffect';
import type { QualityTier } from './quality';
import { paletteFor } from './seasonPalette';

export function PostFX({ tier }: { tier: QualityTier }) {
  const season = useGame((s) => s.game?.calendar.season ?? 'spring');
  const indoors = useGame((s) => s.game?.player.location === 'house');
  const { grade } = paletteFor(season, 5);
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {tier === 'high' ? (
        <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.8} quality="medium" halfRes />
      ) : (
        <></>
      )}
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.8} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Grade
        saturation={0.06 + (indoors ? 0.05 : grade.saturation)}
        warmth={indoors ? 0.06 : grade.warmth}
      />
      <Vignette offset={0.3} darkness={0.25} />
      <SMAA />
    </EffectComposer>
  );
}
