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
import { QUALITY, type QualityTier } from './quality';
import { paletteFor } from './seasonPalette';

function useGrade() {
  const season = useGame((s) => s.game?.calendar.season ?? 'spring');
  const indoors = useGame((s) => s.game?.player.location === 'house');
  const { grade } = paletteFor(season, 5);
  return {
    saturation: 0.06 + (indoors ? 0.05 : grade.saturation),
    warmth: indoors ? 0.06 : grade.warmth,
  };
}

// EffectComposer children must all be effects (no fragments/false), so each tier gets its own tree.
// `ao` defaults to the tier's setting; the frame-rate profile can turn the AO pass off alone.
export function PostFX({ tier, ao = QUALITY[tier].ao }: { tier: QualityTier; ao?: boolean }) {
  const grade = useGrade();
  if (tier === 'high' && ao)
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.8} quality="medium" halfRes />
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.8} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Grade saturation={grade.saturation} warmth={grade.warmth} />
        <Vignette offset={0.3} darkness={0.25} />
        <SMAA />
      </EffectComposer>
    );
  if (tier === 'high')
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.8} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Grade saturation={grade.saturation} warmth={grade.warmth} />
        <Vignette offset={0.3} darkness={0.25} />
        <SMAA />
      </EffectComposer>
    );
  // Low: no bloom; tone mapping, grade and vignette merge into one pass, so colours stay true.
  if (!QUALITY[tier].bloom)
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Grade saturation={grade.saturation} warmth={grade.warmth} />
        <Vignette offset={0.3} darkness={0.25} />
        <SMAA />
      </EffectComposer>
    );
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.6} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Grade saturation={grade.saturation} warmth={grade.warmth} />
      <Vignette offset={0.3} darkness={0.25} />
      <SMAA />
    </EffectComposer>
  );
}
