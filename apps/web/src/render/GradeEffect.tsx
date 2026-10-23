import { wrapEffect } from '@react-three/postprocessing';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

const fragment = /* glsl */ `
  uniform float saturation;
  uniform float warmth;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, 1.0 + saturation);
    c *= vec3(1.0 + warmth, 1.0 + warmth * 0.35, 1.0 - warmth);
    outputColor = vec4(c, inputColor.a);
  }
`;

class GradeEffectImpl extends Effect {
  constructor({ saturation = 0, warmth = 0 }: { saturation?: number; warmth?: number } = {}) {
    super('GradeEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['saturation', new Uniform(saturation)],
        ['warmth', new Uniform(warmth)],
      ]),
    });
  }
  set saturation(v: number) {
    const u = this.uniforms.get('saturation');
    if (u) u.value = v;
  }
  set warmth(v: number) {
    const u = this.uniforms.get('warmth');
    if (u) u.value = v;
  }
}

/** Per-season colour grade (spec §4.3): saturation and warm/cool balance. */
export const Grade = wrapEffect(GradeEffectImpl);
