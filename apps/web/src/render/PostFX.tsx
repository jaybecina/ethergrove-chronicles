import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { QualityTier } from './quality';

export function PostFX({ tier }: { tier: QualityTier }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {tier === 'high' ? (
        <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.8} quality="medium" halfRes />
      ) : (
        <></>
      )}
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.8} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.25} />
      <SMAA />
    </EffectComposer>
  );
}
